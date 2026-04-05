import numpy as np
import cv2
from sqlalchemy.orm import Session

from app.config import (
    INSIGHTFACE_MODEL_NAME,
    DETECTION_SIZE,
    FACE_DETECTION_CONFIDENCE_THRESHOLD,
)
from app.models import Photo, Face
from app.services.thumbnail import create_face_thumbnail

_face_app = None


def get_face_app():
    global _face_app
    if _face_app is None:
        import insightface

        _face_app = insightface.app.FaceAnalysis(
            name=INSIGHTFACE_MODEL_NAME,
            providers=["CPUExecutionProvider"],
        )
        _face_app.prepare(ctx_id=0, det_size=DETECTION_SIZE)
    return _face_app


def detect_faces_in_photo(db: Session, photo: Photo, progress_callback=None):
    app = get_face_app()

    img = cv2.imread(photo.file_path)
    if img is None:
        return 0

    img_h, img_w = img.shape[:2]
    faces = app.get(img)

    face_count = 0
    for face_data in faces:
        score = float(face_data.det_score)
        if score < FACE_DETECTION_CONFIDENCE_THRESHOLD:
            continue

        bbox = face_data.bbox  # [x1, y1, x2, y2] in pixels
        x1, y1, x2, y2 = bbox

        # Normalize to 0-1
        norm_x = float(x1) / img_w
        norm_y = float(y1) / img_h
        norm_w = float(x2 - x1) / img_w
        norm_h = float(y2 - y1) / img_h

        embedding_bytes = face_data.embedding.astype(np.float32).tobytes()

        face = Face(
            photo_id=photo.id,
            bbox_x=norm_x,
            bbox_y=norm_y,
            bbox_w=norm_w,
            bbox_h=norm_h,
            embedding=embedding_bytes,
            confidence=score,
            review_status="pending",
        )
        db.add(face)
        db.flush()

        # Create face thumbnail
        face_thumb = create_face_thumbnail(
            photo.file_path,
            face.id,
            (norm_x, norm_y, norm_w, norm_h),
            img_w,
            img_h,
        )
        face.face_thumbnail_path = face_thumb
        face_count += 1

    photo.scanned = True
    db.commit()
    return face_count


def detect_all_faces(db: Session, progress_callback=None):
    unscanned = db.query(Photo).filter(Photo.scanned == False).all()
    total = len(unscanned)
    total_faces = 0

    for i, photo in enumerate(unscanned):
        try:
            count = detect_faces_in_photo(db, photo)
            total_faces += count
            if progress_callback:
                progress_callback(
                    "detecting",
                    i + 1,
                    total,
                    f"Found {count} face(s) in {photo.filename}",
                )
        except Exception as e:
            if progress_callback:
                progress_callback(
                    "detecting",
                    i + 1,
                    total,
                    f"Error processing {photo.filename}: {e}",
                )

    return total_faces
