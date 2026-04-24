# Photos Classifier

A self-hosted, Google Photos-like application that automatically detects faces in your photo library, clusters them by identity, and lets you label people. Once you name a face, the label propagates to every photo where that person appears. Runs entirely locally -- no cloud APIs or online services required.

## Features

- **Automatic face detection** using InsightFace (SCRFD detector + ArcFace embeddings, 99.4% accuracy on LFW)
- **Unsupervised clustering** via Chinese Whispers algorithm -- automatically groups faces by identity without knowing the number of people
- **Smart annotation** -- only asks you to verify faces it's unsure about, not every single one
- **Label propagation** -- name one face and every occurrence of that person gets tagged
- **Merge & split** -- fix clustering mistakes by merging duplicate persons or splitting mismatched ones
- **Google Photos-style UI** -- masonry photo grid, people page, per-person gallery, full-size viewer with face overlays
- **Real-time progress** -- WebSocket updates during scanning, detection, and clustering
- **Incremental scanning** -- re-scan picks up only new/changed photos

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Face Detection | InsightFace SCRFD |
| Face Embeddings | ArcFace (512-dim, via InsightFace `buffalo_l`) |
| Face Clustering | Chinese Whispers |
| Backend | Python 3.11+, FastAPI, SQLite, SQLAlchemy |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Image Processing | OpenCV, Pillow |

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- ~1.5 GB disk space for ML models (downloaded automatically on first run)

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The API server starts at **http://localhost:8000**. On first run, InsightFace downloads the `buffalo_l` model pack (~600MB) automatically.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at **http://localhost:5173** and proxies API requests to the backend.

### 3. Scan your photos

1. Open **http://localhost:5173** in your browser
2. Go to **Settings** (gear icon in the sidebar)
3. Enter the path to your photos directory (e.g. `/home/user/Pictures`)
4. Click **Scan**

The system will:
- Discover all images in the directory (recursively)
- Generate thumbnails
- Detect faces and extract embeddings
- Cluster faces into person groups
- Progress is shown in real-time via the bottom-right indicator

## Usage Guide

### Pages

| Page | Path | Description |
|------|------|-------------|
| Photos | `/` | Masonry grid of all photos, grouped by date. Click a photo to open the full-size viewer with face overlays. |
| People | `/people` | Grid of detected persons. Double-click a name to rename. Use "Merge people" to combine duplicates. |
| Person Detail | `/person/:id` | All photos containing a specific person. Click the name to rename. |
| Review | `/annotate` | Smart face verification workflow. The system presents uncertain faces for you to confirm. |
| Settings | `/settings` | Configure photo directory, trigger scans, view statistics. |

### Labelling Faces

- **From the photo viewer**: Click any face bounding box to assign it to an existing person or create a new one.
- **From the People page**: Double-click a person's name to rename them.
- **From the Review page**: The system shows side-by-side face comparisons for uncertain matches. Use the buttons or keyboard shortcuts:
  - `Y` = Same person
  - `N` = Different person
  - `S` = Skip for now (will reappear later)

### Smart Annotation

Not every face requires manual review. The system uses three confidence tiers:

| Tier | Similarity | Action |
|------|-----------|--------|
| High | > 0.70 | Auto-assigned to the cluster, no review needed |
| Medium | 0.45 - 0.70 | Queued for side-by-side verification |
| Low | < 0.45 | Flagged as a likely new person |

Skipped faces are re-surfaced in future review sessions, prioritized by how long they've been waiting.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/photos` | List photos (paginated, filterable by `person_id`) |
| `GET` | `/api/photos/{id}` | Photo detail with detected faces |
| `GET` | `/api/photos/{id}/thumbnail` | Serve photo thumbnail |
| `GET` | `/api/photos/{id}/full` | Serve full-size image |
| `GET` | `/api/faces/{id}/thumbnail` | Serve cropped face thumbnail |
| `PUT` | `/api/faces/{id}/assign` | Reassign face to a different person |
| `POST` | `/api/faces/{id}/new-person` | Create a new person from a face |
| `GET` | `/api/persons` | List all persons |
| `PUT` | `/api/persons/{id}` | Update person name |
| `POST` | `/api/persons/merge` | Merge multiple persons |
| `DELETE` | `/api/persons/{id}` | Delete a person |
| `GET` | `/api/annotations/pending` | Get faces needing review |
| `GET` | `/api/annotations/stats` | Annotation statistics |
| `POST` | `/api/annotations/verify-pair` | Confirm/deny face match |
| `POST` | `/api/annotations/resolve-new` | Handle unmatched face |
| `POST` | `/api/scan/start` | Start scanning a directory |
| `GET` | `/api/scan/status` | Current scan status |
| `WS` | `/api/scan/ws` | Real-time scan progress |

Interactive API docs available at **http://localhost:8000/docs** (Swagger UI).

## Configuration

Settings are in `backend/app/config.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `PHOTOS_DIR` env var | `~/Pictures` | Default photo directory |
| `SUPPORTED_EXTENSIONS` | jpg, jpeg, png, webp, bmp, tiff | Image formats to scan |
| `FACE_DETECTION_CONFIDENCE_THRESHOLD` | 0.5 | Minimum detection confidence |
| `CLUSTERING_SIMILARITY_THRESHOLD` | 0.55 | Cosine similarity threshold for Chinese Whispers edges |
| `CLUSTERING_ITERATIONS` | 20 | Max Chinese Whispers iterations |
| `HIGH_CONFIDENCE_THRESHOLD` | 0.70 | Auto-assign faces above this similarity |
| `MEDIUM_CONFIDENCE_THRESHOLD` | 0.45 | Queue for review between this and high threshold |
| `THUMBNAIL_MAX_WIDTH` | 400 | Photo thumbnail width in pixels |
| `FACE_THUMBNAIL_SIZE` | 112 | Face crop size in pixels |

## Project Structure

```
photos-classifier/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── config.py            # Settings and thresholds
│   │   ├── database.py          # SQLite + SQLAlchemy setup
│   │   ├── models.py            # ORM models (Photo, Face, Person)
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── routers/             # API endpoint handlers
│   │   │   ├── photos.py        # Photo CRUD and serving
│   │   │   ├── faces.py         # Face assignment
│   │   │   ├── persons.py       # Person management
│   │   │   ├── annotations.py   # Smart verification workflow
│   │   │   └── scan.py          # Scan control + WebSocket
│   │   ├── services/            # Business logic
│   │   │   ├── scanner.py       # Directory walking and indexing
│   │   │   ├── face_detector.py # InsightFace detection + embeddings
│   │   │   ├── clustering.py    # Chinese Whispers algorithm
│   │   │   ├── annotation.py    # Review queue and confidence tiers
│   │   │   ├── labeller.py      # Label propagation and merging
│   │   │   └── thumbnail.py     # Photo and face thumbnail generation
│   │   └── utils/
│   │       └── image.py         # EXIF, hashing, image utilities
│   ├── requirements.txt
│   └── run.py                   # Uvicorn launcher
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router setup
│   │   ├── api/client.ts        # API client
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── hooks/               # React hooks
│   │   └── types/index.ts       # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts           # Vite config with API proxy
└── data/                        # Created at runtime (gitignored)
    ├── photos.db                # SQLite database
    ├── thumbnails/              # Photo thumbnails
    └── face_thumbnails/         # Cropped face images
```

## How It Works

1. **Scan**: Walks your photo directory, hashes files for deduplication, generates thumbnails, extracts EXIF dates
2. **Detect**: Runs InsightFace's SCRFD detector on each photo to find faces, then extracts 512-dimensional ArcFace embeddings
3. **Cluster**: Builds a similarity graph between all face embeddings and runs Chinese Whispers to group faces by identity
4. **Review**: Faces in the medium-confidence zone are queued for user verification via side-by-side comparison cards
5. **Label**: When you name a person, all faces in their cluster inherit the label. Merge/split to correct mistakes.

## License

MIT
