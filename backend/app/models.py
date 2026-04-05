from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    LargeBinary,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, unique=True, nullable=False)
    filename = Column(String, nullable=False)
    file_hash = Column(String, nullable=False, index=True)
    width = Column(Integer)
    height = Column(Integer)
    taken_at = Column(DateTime, nullable=True)
    thumbnail_path = Column(String, nullable=True)
    scanned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    faces = relationship("Face", back_populates="photo", cascade="all, delete-orphan")


class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    representative_face_id = Column(Integer, nullable=True)
    face_count = Column(Integer, default=0)
    centroid_embedding = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    faces = relationship("Face", back_populates="person", foreign_keys="Face.person_id")


class Face(Base):
    __tablename__ = "faces"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    embedding = Column(LargeBinary, nullable=False)
    confidence = Column(Float, nullable=False)
    face_thumbnail_path = Column(String, nullable=True)
    review_status = Column(String, default="pending")  # auto, confirmed, pending, skipped
    best_match_person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    best_match_score = Column(Float, nullable=True)
    skip_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    photo = relationship("Photo", back_populates="faces")
    person = relationship("Person", back_populates="faces", foreign_keys=[person_id])
    best_match_person = relationship("Person", foreign_keys=[best_match_person_id])
