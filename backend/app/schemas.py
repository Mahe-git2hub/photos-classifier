from datetime import datetime
from pydantic import BaseModel


class PhotoBase(BaseModel):
    file_path: str
    filename: str


class PhotoOut(BaseModel):
    id: int
    file_path: str
    filename: str
    width: int | None
    height: int | None
    taken_at: datetime | None
    scanned: bool
    face_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class PhotoDetail(PhotoOut):
    faces: list["FaceOut"] = []


class FaceOut(BaseModel):
    id: int
    photo_id: int
    person_id: int | None
    person_name: str | None = None
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    confidence: float
    review_status: str
    best_match_score: float | None
    skip_count: int

    model_config = {"from_attributes": True}


class PersonOut(BaseModel):
    id: int
    name: str | None
    face_count: int
    representative_face_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PersonUpdate(BaseModel):
    name: str


class PersonMerge(BaseModel):
    person_ids: list[int]


class FaceAssign(BaseModel):
    person_id: int


class ScanRequest(BaseModel):
    directory_path: str


class ScanStatus(BaseModel):
    is_scanning: bool
    phase: str
    progress: float
    total_photos: int
    processed_photos: int
    total_faces: int
    message: str


class AnnotationReview(BaseModel):
    face_id: int
    face_thumbnail_url: str
    review_type: str  # "pair_verify" or "new_face"
    best_match_person_id: int | None
    best_match_person_name: str | None
    best_match_face_thumbnail_url: str | None
    best_match_score: float | None
    candidate_persons: list["CandidatePerson"] = []


class CandidatePerson(BaseModel):
    person_id: int
    person_name: str | None
    representative_face_thumbnail_url: str | None
    similarity_score: float


class VerifyPairRequest(BaseModel):
    face_id: int
    person_id: int
    action: str  # "same", "different", "skip"


class ResolveNewFaceRequest(BaseModel):
    face_id: int
    action: str  # "assign", "create_new", "skip"
    person_id: int | None = None
    name: str | None = None


class AnnotationStats(BaseModel):
    pending: int
    skipped: int
    confirmed: int
    auto_assigned: int
    total_faces: int
