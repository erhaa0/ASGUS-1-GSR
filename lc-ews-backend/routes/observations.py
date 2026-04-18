from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db, generate_id
from models.db_models import Observation, Zone
from datetime import datetime, timezone
from pydantic import BaseModel
from auth_middleware import get_current_user
import os, shutil


router = APIRouter()

class ObservationRequest(BaseModel):
    user_id:        str
    zone_id:        str
    event_type:     str
    severity:       str
    estimated_scale:str | None = None
    latitude:       float | None = None
    longitude:      float | None = None
    notes:          str | None = None

@router.post("/observations")
def submit_observation(req: ObservationRequest,db: Session = Depends(get_db),_:   object  = Depends(get_current_user)):
    zone = db.query(Zone).filter(
        Zone.zone_id == req.zone_id
    ).first()

    obs = Observation(
        observation_id  = generate_id("obs"),
        user_id         = req.user_id,
        zone_id         = req.zone_id,
        zone_name       = zone.zone_name if zone else req.zone_id,
        event_type      = req.event_type,
        severity        = req.severity,
        estimated_scale = req.estimated_scale,
        latitude        = req.latitude,
        longitude       = req.longitude,
        notes           = req.notes,
        status          = "Submitted",
        submitted_at    = datetime.now(timezone.utc)
    )
    db.add(obs)
    db.commit()

    return {
        "observation_id": obs.observation_id,
        "status":         "Submitted",
        "timestamp":      obs.submitted_at
    }

@router.post("/observations/{observation_id}/photo")
async def upload_observation_photo(
    observation_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _:  object    = Depends(get_current_user)
):
    obs = db.query(Observation).filter(Observation.observation_id == observation_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    upload_dir = "uploads/observations"
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = f"{observation_id}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_filename)
    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    obs.photo_url = file_path
    db.commit()

    return {"photo_url": file_path, "status": "uploaded"}

@router.get("/observations")
def get_observations(
    user_id: str | None = Query(None),
    zone_id: str | None = Query(None),
    db: Session = Depends(get_db),
    _:       object     = Depends(get_current_user)
):
    query = db.query(Observation).order_by(
        Observation.submitted_at.desc()
    )
    if user_id:
        query = query.filter(Observation.user_id == user_id)
    if zone_id:
        query = query.filter(Observation.zone_id == zone_id)

    return [
        {
            "observation_id":  o.observation_id,
            "user_id":         o.user_id,
            "zone_id":         o.zone_id,
            "zone_name":       o.zone_name,
            "event_type":      o.event_type,
            "severity":        o.severity,
            "estimated_scale": o.estimated_scale,
            "latitude":        o.latitude,
            "longitude":       o.longitude,
            "notes":           o.notes,
            "status":          o.status,
            "submitted_at":    o.submitted_at,
        }
        for o in query.all()
    ]