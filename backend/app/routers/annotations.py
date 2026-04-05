from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    AnnotationReview,
    AnnotationStats,
    VerifyPairRequest,
    ResolveNewFaceRequest,
    CandidatePerson,
)
from app.services.annotation import (
    get_pending_reviews,
    verify_pair,
    resolve_new_face,
    get_annotation_stats,
)

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


@router.get("/pending", response_model=list[AnnotationReview])
def get_pending(limit: int = 10, db: Session = Depends(get_db)):
    reviews = get_pending_reviews(db, limit=limit)

    result = []
    for r in reviews:
        candidates = [
            CandidatePerson(
                person_id=c["person_id"],
                person_name=c["person_name"],
                representative_face_thumbnail_url=(
                    f"/api/faces/{c['representative_face_id']}/thumbnail"
                    if c.get("representative_face_id")
                    else None
                ),
                similarity_score=c["similarity_score"],
            )
            for c in r.get("candidate_persons", [])
        ]

        result.append(
            AnnotationReview(
                face_id=r["face_id"],
                face_thumbnail_url=f"/api/faces/{r['face_id']}/thumbnail",
                review_type=r["review_type"],
                best_match_person_id=r.get("best_match_person_id"),
                best_match_person_name=r.get("best_match_person_name"),
                best_match_face_thumbnail_url=(
                    f"/api/faces/{r['best_match_face_id']}/thumbnail"
                    if r.get("best_match_face_id")
                    else None
                ),
                best_match_score=r.get("best_match_score"),
                candidate_persons=candidates,
            )
        )

    return result


@router.get("/stats", response_model=AnnotationStats)
def get_stats(db: Session = Depends(get_db)):
    stats = get_annotation_stats(db)
    return AnnotationStats(**stats)


@router.post("/verify-pair")
def verify_pair_endpoint(body: VerifyPairRequest, db: Session = Depends(get_db)):
    if body.action not in ("same", "different", "skip"):
        raise HTTPException(status_code=400, detail="Invalid action")

    success = verify_pair(db, body.face_id, body.person_id, body.action)
    if not success:
        raise HTTPException(status_code=404, detail="Face not found")
    return {"detail": "ok"}


@router.post("/resolve-new")
def resolve_new_endpoint(body: ResolveNewFaceRequest, db: Session = Depends(get_db)):
    if body.action not in ("assign", "create_new", "skip"):
        raise HTTPException(status_code=400, detail="Invalid action")

    result = resolve_new_face(db, body.face_id, body.action, body.person_id, body.name)
    if result is None:
        raise HTTPException(status_code=404, detail="Face not found")
    return {"detail": "ok"}
