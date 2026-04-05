import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
THUMBNAILS_DIR = DATA_DIR / "thumbnails"
FACE_THUMBNAILS_DIR = DATA_DIR / "face_thumbnails"
DATABASE_URL = f"sqlite:///{DATA_DIR / 'photos.db'}"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
THUMBNAILS_DIR.mkdir(exist_ok=True)
FACE_THUMBNAILS_DIR.mkdir(exist_ok=True)

# Photo scanning
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}
THUMBNAIL_MAX_WIDTH = 400
FACE_THUMBNAIL_SIZE = 112

# Face detection
FACE_DETECTION_CONFIDENCE_THRESHOLD = 0.5
INSIGHTFACE_MODEL_NAME = "buffalo_l"
DETECTION_SIZE = (640, 640)

# Clustering
CLUSTERING_SIMILARITY_THRESHOLD = 0.55
CLUSTERING_ITERATIONS = 20

# Annotation confidence tiers
HIGH_CONFIDENCE_THRESHOLD = 0.7
MEDIUM_CONFIDENCE_THRESHOLD = 0.45

# Default photo directory (can be overridden via API)
DEFAULT_PHOTOS_DIR = os.environ.get("PHOTOS_DIR", str(Path.home() / "Pictures"))
