import os
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import SUPPORTED_EXTENSIONS
from app.models import Photo
from app.utils.image import get_file_hash, get_image_dimensions, get_exif_date
from app.services.thumbnail import create_photo_thumbnail


def discover_photos(directory: str) -> list[str]:
    photo_paths = []
    for root, _, files in os.walk(directory):
        for fname in files:
            ext = Path(fname).suffix.lower()
            if ext in SUPPORTED_EXTENSIONS:
                photo_paths.append(os.path.join(root, fname))
    photo_paths.sort()
    return photo_paths


def scan_photos(db: Session, directory: str, progress_callback=None):
    photo_paths = discover_photos(directory)
    total = len(photo_paths)

    existing_hashes = {p.file_hash for p in db.query(Photo.file_hash).all()}
    existing_paths = {p.file_path for p in db.query(Photo.file_path).all()}

    new_count = 0
    for i, fpath in enumerate(photo_paths):
        if fpath in existing_paths:
            if progress_callback:
                progress_callback("scanning", i + 1, total, f"Skipping {Path(fpath).name} (already indexed)")
            continue

        try:
            file_hash = get_file_hash(fpath)
            if file_hash in existing_hashes:
                if progress_callback:
                    progress_callback("scanning", i + 1, total, f"Skipping duplicate {Path(fpath).name}")
                continue

            width, height = get_image_dimensions(fpath)
            taken_at = get_exif_date(fpath)

            photo = Photo(
                file_path=fpath,
                filename=Path(fpath).name,
                file_hash=file_hash,
                width=width,
                height=height,
                taken_at=taken_at,
                scanned=False,
            )
            db.add(photo)
            db.flush()

            thumb_path = create_photo_thumbnail(fpath, photo.id)
            photo.thumbnail_path = thumb_path
            db.commit()

            existing_hashes.add(file_hash)
            existing_paths.add(fpath)
            new_count += 1

            if progress_callback:
                progress_callback("scanning", i + 1, total, f"Indexed {Path(fpath).name}")
        except Exception as e:
            if progress_callback:
                progress_callback("scanning", i + 1, total, f"Error: {Path(fpath).name}: {e}")
            continue

    return new_count, total
