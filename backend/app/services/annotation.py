import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import HIGH_CONFIDENCE_THRESHOLD, MEDIUM_CONFIDENCE_THRESHOLD
from app.models import Face, Person


def _get_person_centroid(db: Session, person_id: int) -> np.ndarray | None:
    person = db.query(Person).filter(Person.id == person_id).first()
    if person and person.centroid_embedding:
        return np.frombuffer(person.centroid_embedding, dtype=np.float32)
    return None


def _recalculate_person_centroid(db: Session, person: Person):
    faces = db.query(Face).filter(Face.person_id == person.id).all()
    if not faces:
        return
    embeddings = [np.frombuffer(f.embedding, dtype=np.float32) for f in faces]
    centroid = np.mean(embeddings, axis=0)
    person.centroid_embedding = centroid.astype(np.float32).tobytes()
    person.face_count = len(faces)

    # Update representative face (highest confidence)
    best_face = max(faces, key=lambda f: f.confidence)
    person.representative_face_id = best_face.id


def get_pending_reviews(db: Session, limit: int = 10) -> list[dict]:
    # Priority 1: Previously skipped faces (oldest skips first)
    skipped = (
        db.query(Face)
        .filter(Face.review_status == "skipped")
        .order_by(Face.skip_count.asc(), Face.created_at.asc())
        .limit(limit)
        .all()
    )

    remaining = limit - len(skipped)
    pending = []
    if remaining > 0:
        # Priority 2: New pending faces (closest to decision boundary)
        pending = (
            db.query(Face)
            .filter(
                Face.review_status == "pending",
                Face.best_match_score.isnot(None),
            )
            .order_by(
                # Closest to the medium threshold boundary = most uncertain
                func.abs(Face.best_match_score - MEDIUM_CONFIDENCE_THRESHOLD)
            )
            .limit(remaining)
            .all()
        )

    reviews = []
    for face in skipped + pending:
        review = _build_review(db, face)
        if review:
            reviews.append(review)

    return reviews


def _build_review(db: Session, face: Face) -> dict | None:
    # Determine review type
    if face.best_match_person_id:
        person = db.query(Person).filter(Person.id == face.best_match_person_id).first()
        if not person:
            return None

        # Get representative face for the person
        rep_face = None
        if person.representative_face_id:
            rep_face = db.query(Face).filter(Face.id == person.representative_face_id).first()

        # Also find top candidate persons
        candidates = _find_candidate_persons(db, face, top_k=3)

        return {
            "face_id": face.id,
            "photo_id": face.photo_id,
            "review_type": "pair_verify" if face.best_match_score and face.best_match_score >= MEDIUM_CONFIDENCE_THRESHOLD else "new_face",
            "best_match_person_id": person.id,
            "best_match_person_name": person.name,
            "best_match_face_id": person.representative_face_id,
            "best_match_score": face.best_match_score,
            "candidate_persons": candidates,
            "skip_count": face.skip_count,
        }
    else:
        # No best match - treat as new face
        candidates = _find_candidate_persons(db, face, top_k=3)
        return {
            "face_id": face.id,
            "photo_id": face.photo_id,
            "review_type": "new_face",
            "best_match_person_id": None,
            "best_match_person_name": None,
            "best_match_face_id": None,
            "best_match_score": None,
            "candidate_persons": candidates,
            "skip_count": face.skip_count,
        }


def _find_candidate_persons(db: Session, face: Face, top_k: int = 3) -> list[dict]:
    face_emb = np.frombuffer(face.embedding, dtype=np.float32)
    face_emb_norm = face_emb / (np.linalg.norm(face_emb) + 1e-8)

    persons = db.query(Person).filter(Person.centroid_embedding.isnot(None)).all()

    scored = []
    for person in persons:
        centroid = np.frombuffer(person.centroid_embedding, dtype=np.float32)
        centroid_norm = centroid / (np.linalg.norm(centroid) + 1e-8)
        sim = float(np.dot(face_emb_norm, centroid_norm))
        scored.append({
            "person_id": person.id,
            "person_name": person.name,
            "representative_face_id": person.representative_face_id,
            "similarity_score": sim,
        })

    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:top_k]


def verify_pair(db: Session, face_id: int, person_id: int, action: str):
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        return False

    if action == "same":
        face.person_id = person_id
        face.review_status = "confirmed"
        face.best_match_person_id = None
        face.best_match_score = None
        face.skip_count = 0

        # Recalculate centroid
        person = db.query(Person).filter(Person.id == person_id).first()
        if person:
            _recalculate_person_centroid(db, person)

    elif action == "different":
        face.review_status = "pending"
        face.best_match_person_id = None
        face.best_match_score = None

        # Find next best match
        candidates = _find_candidate_persons(db, face, top_k=1)
        if candidates and candidates[0]["similarity_score"] >= MEDIUM_CONFIDENCE_THRESHOLD:
            face.best_match_person_id = candidates[0]["person_id"]
            face.best_match_score = candidates[0]["similarity_score"]

    elif action == "skip":
        face.review_status = "skipped"
        face.skip_count += 1

    db.commit()
    return True


def resolve_new_face(
    db: Session,
    face_id: int,
    action: str,
    person_id: int | None = None,
    name: str | None = None,
):
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        return None

    if action == "assign" and person_id is not None:
        face.person_id = person_id
        face.review_status = "confirmed"
        face.best_match_person_id = None
        face.best_match_score = None

        person = db.query(Person).filter(Person.id == person_id).first()
        if person:
            _recalculate_person_centroid(db, person)

    elif action == "create_new":
        emb = np.frombuffer(face.embedding, dtype=np.float32)
        person = Person(
            name=name,
            representative_face_id=face.id,
            face_count=1,
            centroid_embedding=emb.astype(np.float32).tobytes(),
        )
        db.add(person)
        db.flush()

        face.person_id = person.id
        face.review_status = "confirmed"
        face.best_match_person_id = None
        face.best_match_score = None

    elif action == "skip":
        face.review_status = "skipped"
        face.skip_count += 1

    db.commit()
    return face


def get_annotation_stats(db: Session) -> dict:
    total = db.query(func.count(Face.id)).scalar() or 0
    pending = db.query(func.count(Face.id)).filter(Face.review_status == "pending").scalar() or 0
    skipped = db.query(func.count(Face.id)).filter(Face.review_status == "skipped").scalar() or 0
    confirmed = db.query(func.count(Face.id)).filter(Face.review_status == "confirmed").scalar() or 0
    auto = db.query(func.count(Face.id)).filter(Face.review_status == "auto").scalar() or 0

    return {
        "total_faces": total,
        "pending": pending,
        "skipped": skipped,
        "confirmed": confirmed,
        "auto_assigned": auto,
    }
