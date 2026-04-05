import hashlib
from datetime import datetime
from pathlib import Path

from PIL import Image, ExifTags


def get_file_hash(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def get_image_dimensions(file_path: str) -> tuple[int, int]:
    with Image.open(file_path) as img:
        return img.size


def get_exif_date(file_path: str) -> datetime | None:
    try:
        with Image.open(file_path) as img:
            exif_data = img._getexif()
            if exif_data is None:
                return None
            for tag_id, value in exif_data.items():
                tag = ExifTags.TAGS.get(tag_id, "")
                if tag == "DateTimeOriginal":
                    return datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None
    return None


def generate_thumbnail(
    source_path: str, output_path: str, max_width: int = 400
) -> str:
    with Image.open(source_path) as img:
        img = img.convert("RGB")
        # Maintain aspect ratio
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        if ratio < 1:
            img = img.resize((max_width, new_height), Image.LANCZOS)
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(output), "JPEG", quality=85)
    return output_path


def crop_face_thumbnail(
    source_path: str,
    output_path: str,
    bbox: tuple[float, float, float, float],
    img_width: int,
    img_height: int,
    size: int = 112,
) -> str:
    x, y, w, h = bbox
    # Convert normalized coords to pixels
    left = int(x * img_width)
    top = int(y * img_height)
    right = int((x + w) * img_width)
    bottom = int((y + h) * img_height)

    # Add padding (20%)
    pad_w = int((right - left) * 0.2)
    pad_h = int((bottom - top) * 0.2)
    left = max(0, left - pad_w)
    top = max(0, top - pad_h)
    right = min(img_width, right + pad_w)
    bottom = min(img_height, bottom + pad_h)

    with Image.open(source_path) as img:
        img = img.convert("RGB")
        face_crop = img.crop((left, top, right, bottom))
        face_crop = face_crop.resize((size, size), Image.LANCZOS)
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)
        face_crop.save(str(output), "JPEG", quality=90)
    return output_path
