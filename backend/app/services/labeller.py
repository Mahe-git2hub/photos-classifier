import numpy as np
from sqlalchemy.orm import Session

from app.models import Face, Person
from app.services.annotation import _recalculate_person_centroid


def label_person(db: Session, person_id: int, name: str) -> Person | None:
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        return None
    person.name = name
    db.commit()
    return person


def move_face_to_person(db: Session, face_id: int, target_person_id: int) -> bool:
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        return False

    old_person_id = face.person_id

    face.person_id = target_person_id
    face.review_status = "confirmed"
    db.flush()

    # Recalculate both persons' centroids
    target_person = db.query(Person).filter(Person.id == target_person_id).first()
    if target_person:
        _recalculate_person_centroid(db, target_person)

    if old_person_id:
        old_person = db.query(Person).filter(Person.id == old_person_id).first()
        if old_person:
            remaining = db.query(Face).filter(Face.person_id == old_person_id).count()
            if remaining == 0:
                db.delete(old_person)
            else:
                _recalculate_person_centroid(db, old_person)

    db.commit()
    return True


def merge_persons(db: Session, person_ids: list[int]) -> Person | None:
    if len(person_ids) < 2:
        return None

    persons = db.query(Person).filter(Person.id.in_(person_ids)).all()
    if len(persons) < 2:
        return None

    # Keep the first person (or one with a name)
    primary = next((p for p in persons if p.name), persons[0])
    others = [p for p in persons if p.id != primary.id]

    # Move all faces to the primary person
    for other in others:
        db.query(Face).filter(Face.person_id == other.id).update(
            {Face.person_id: primary.id}, synchronize_session="fetch"
        )
        db.delete(other)

    _recalculate_person_centroid(db, primary)
    db.commit()
    return primary


def create_person_from_face(db: Session, face_id: int, name: str | None = None) -> Person | None:
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        return None

    emb = np.frombuffer(face.embedding, dtype=np.float32)
    person = Person(
        name=name,
        representative_face_id=face.id,
        face_count=1,
        centroid_embedding=emb.astype(np.float32).tobytes(),
    )
    db.add(person)
    db.flush()

    old_person_id = face.person_id
    face.person_id = person.id
    face.review_status = "confirmed"

    # Clean up old person
    if old_person_id:
        old_person = db.query(Person).filter(Person.id == old_person_id).first()
        if old_person:
            remaining = db.query(Face).filter(Face.person_id == old_person_id).count()
            if remaining == 0:
                db.delete(old_person)
            else:
                _recalculate_person_centroid(db, old_person)

    db.commit()
    return person
