from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Face
from app.schemas import FaceAssign, FaceOut
from app.services.labeller import move_face_to_person, create_person_from_face

router = APIRouter(prefix="/api/faces", tags=["faces"])


@router.get("/{face_id}/thumbnail")
def get_face_thumbnail(face_id: int, db: Session = Depends(get_db)):
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face or not face.face_thumbnail_path:
        raise HTTPException(status_code=404, detail="Face thumbnail not found")
    if not Path(face.face_thumbnail_path).exists():
        raise HTTPException(status_code=404, detail="Face thumbnail file missing")
    return FileResponse(face.face_thumbnail_path, media_type="image/jpeg")


@router.put("/{face_id}/assign", response_model=FaceOut)
def assign_face(face_id: int, body: FaceAssign, db: Session = Depends(get_db)):
    success = move_face_to_person(db, face_id, body.person_id)
    if not success:
        raise HTTPException(status_code=404, detail="Face not found")

    face = db.query(Face).filter(Face.id == face_id).first()
    return FaceOut.model_validate(face)


@router.post("/{face_id}/new-person", response_model=FaceOut)
def create_new_person_from_face(
    face_id: int, name: str | None = None, db: Session = Depends(get_db)
):
    person = create_person_from_face(db, face_id, name)
    if not person:
        raise HTTPException(status_code=404, detail="Face not found")

    face = db.query(Face).filter(Face.id == face_id).first()
    return FaceOut.model_validate(face)
