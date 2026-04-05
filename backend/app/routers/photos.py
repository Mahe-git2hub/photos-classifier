from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Photo, Face, Person
from app.schemas import PhotoOut, PhotoDetail, FaceOut

router = APIRouter(prefix="/api/photos", tags=["photos"])


@router.get("", response_model=list[PhotoOut])
def list_photos(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    person_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Photo)

    if person_id is not None:
        query = query.join(Face, Face.photo_id == Photo.id).filter(
            Face.person_id == person_id
        )

    total = query.count()
    photos = (
        query.order_by(Photo.taken_at.desc().nullslast(), Photo.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    result = []
    for photo in photos:
        face_count = db.query(func.count(Face.id)).filter(Face.photo_id == photo.id).scalar()
        out = PhotoOut.model_validate(photo)
        out.face_count = face_count
        result.append(out)

    return result


@router.get("/{photo_id}", response_model=PhotoDetail)
def get_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    faces = db.query(Face).filter(Face.photo_id == photo_id).all()
    face_outs = []
    for face in faces:
        fo = FaceOut.model_validate(face)
        if face.person_id:
            person = db.query(Person).filter(Person.id == face.person_id).first()
            fo.person_name = person.name if person else None
        face_outs.append(fo)

    detail = PhotoDetail.model_validate(photo)
    detail.face_count = len(faces)
    detail.faces = face_outs
    return detail


@router.get("/{photo_id}/thumbnail")
def get_photo_thumbnail(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo or not photo.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    if not Path(photo.thumbnail_path).exists():
        raise HTTPException(status_code=404, detail="Thumbnail file missing")
    return FileResponse(photo.thumbnail_path, media_type="image/jpeg")


@router.get("/{photo_id}/full")
def get_photo_full(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    if not Path(photo.file_path).exists():
        raise HTTPException(status_code=404, detail="Photo file missing")

    suffix = Path(photo.file_path).suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
    }
    return FileResponse(
        photo.file_path, media_type=media_types.get(suffix, "image/jpeg")
    )
