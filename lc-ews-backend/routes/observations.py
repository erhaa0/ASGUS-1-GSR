from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db, generate_id
from models.db_models import Observation, Zone
from datetime import datetime, timezone
from pydantic import BaseModel
from auth_middleware import get_current_user
import os, uuid

from utils.emailer import send_observation_alert

router = APIRouter()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class ObservationRequest(BaseModel):
    # ✅ FIX #3: user_id removed — we use the authenticated user's ID instead
    zone_id:         str
    event_type:      str
    severity:        str
    estimated_scale: str | None = None
    latitude:        float | None = None
    longitude:       float | None = None
    notes:           str | None = None


# ── Submit Observation ─────────────────────────────────────
@router.post("/observations")
def submit_observation(
    req: ObservationRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # ✅ FIX #3: capture real user
):
    zone = db.query(Zone).filter(Zone.zone_id == req.zone_id).first()

    obs = Observation(
        observation_id  = generate_id("obs"),
        user_id         = current_user.user_id,  # ✅ FIX #3: always the real user
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
    db.refresh(obs)

    try:
        send_observation_alert(
            db           = db,
            zone_name    = obs.zone_name,
            event_type   = obs.event_type,
            severity     = obs.severity,
            submitted_by = obs.user_id,
            notes        = obs.notes,
        )
    except Exception as e:
        # ✅ MINOR: don't print user data to logs
        print("Observation email alert failed (non-critical)")

    return {
        "observation_id": obs.observation_id,
        "status":         "Submitted",
        "timestamp":      obs.submitted_at
    }


# ── Upload Observation Photo ──────────────────────────────
@router.post("/observations/{observation_id}/photo")
async def upload_observation_photo(
    observation_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)  # ✅ FIX #6: capture user for ownership check
):
    obs = db.query(Observation).filter(
        Observation.observation_id == observation_id
    ).first()

    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    # ✅ FIX #6: only the submitter or an admin can upload to this observation
    if obs.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You can only upload photos to your own observations"
        )

    # ✅ FIX #6: read into memory first so we can check size
    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum allowed size is 5MB."
        )

    # ✅ FIX #6: detect real MIME type from file bytes, not just the extension
    import magic
    mime = magic.from_buffer(contents, mime=True)

    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{mime}' is not allowed. Only JPEG, PNG, and WebP are accepted."
        )

    # ✅ FIX #6: safe filename using UUID — no path traversal possible
    extension = mime.split("/")[1]  # e.g. "jpeg", "png", "webp"
    safe_filename = f"{observation_id}_{uuid.uuid4().hex}.{extension}"

    upload_dir = "uploads/observations"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buf:
        buf.write(contents)

    obs.photo_url = file_path
    db.commit()

    return {
        "photo_url": file_path,
        "status": "uploaded"
    }


# ── Get Observations ──────────────────────────────────────
@router.get("/observations")
def get_observations(
    zone_id: str | None = Query(None),
    limit:   int        = Query(50, le=200),  # ✅ MINOR: cap max records returned
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Observation).order_by(Observation.submitted_at.desc())

    # ✅ MAJOR: field officers only see their own observations
    if current_user.role == "field_officer":
        query = query.filter(Observation.user_id == current_user.user_id)
    else:
        # admins and analysts can filter by zone
        if zone_id:
            query = query.filter(Observation.zone_id == zone_id)

    query = query.limit(limit)

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
            "photo_url":       o.photo_url,
        }
        for o in query.all()
    ]
