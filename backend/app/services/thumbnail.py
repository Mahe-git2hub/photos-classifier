from pathlib import Path

from app.config import THUMBNAILS_DIR, FACE_THUMBNAILS_DIR, THUMBNAIL_MAX_WIDTH, FACE_THUMBNAIL_SIZE
from app.utils.image import generate_thumbnail, crop_face_thumbnail


def get_photo_thumbnail_path(photo_id: int) -> str:
    return str(THUMBNAILS_DIR / f"photo_{photo_id}.jpg")


def get_face_thumbnail_path(face_id: int) -> str:
    return str(FACE_THUMBNAILS_DIR / f"face_{face_id}.jpg")


def create_photo_thumbnail(source_path: str, photo_id: int) -> str:
    output_path = get_photo_thumbnail_path(photo_id)
    return generate_thumbnail(source_path, output_path, THUMBNAIL_MAX_WIDTH)


def create_face_thumbnail(
    source_path: str,
    face_id: int,
    bbox: tuple[float, float, float, float],
    img_width: int,
    img_height: int,
) -> str:
    output_path = get_face_thumbnail_path(face_id)
    return crop_face_thumbnail(
        source_path, output_path, bbox, img_width, img_height, FACE_THUMBNAIL_SIZE
    )
