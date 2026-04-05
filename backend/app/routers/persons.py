from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Person, Face
from app.schemas import PersonOut, PersonUpdate, PersonMerge
from app.services.labeller import label_person, merge_persons

router = APIRouter(prefix="/api/persons", tags=["persons"])


@router.get("", response_model=list[PersonOut])
def list_persons(db: Session = Depends(get_db)):
    persons = (
        db.query(Person)
        .order_by(Person.face_count.desc())
        .all()
    )
    return [PersonOut.model_validate(p) for p in persons]


@router.get("/{person_id}", response_model=PersonOut)
def get_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return PersonOut.model_validate(person)


@router.put("/{person_id}", response_model=PersonOut)
def update_person(person_id: int, body: PersonUpdate, db: Session = Depends(get_db)):
    person = label_person(db, person_id, body.name)
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return PersonOut.model_validate(person)


@router.post("/merge", response_model=PersonOut)
def merge_persons_endpoint(body: PersonMerge, db: Session = Depends(get_db)):
    person = merge_persons(db, body.person_ids)
    if not person:
        raise HTTPException(status_code=400, detail="Need at least 2 valid persons to merge")
    return PersonOut.model_validate(person)


@router.delete("/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Unassign all faces
    db.query(Face).filter(Face.person_id == person_id).update(
        {Face.person_id: None, Face.review_status: "pending"},
        synchronize_session="fetch",
    )
    db.delete(person)
    db.commit()
    return {"detail": "Person deleted"}
