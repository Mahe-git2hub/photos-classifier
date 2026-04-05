from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import photos, faces, persons, annotations, scan

app = FastAPI(title="Photos Classifier", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(photos.router)
app.include_router(faces.router)
app.include_router(persons.router)
app.include_router(annotations.router)
app.include_router(scan.router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
