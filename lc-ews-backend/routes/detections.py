from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db, generate_id
from models.db_models import Detection, Zone, WeatherSnapshot, ActivityLog, RiskParameter
from auth_middleware import get_current_user, require_admin, require_analyst
from datetime import datetime, timezone
from pydantic import BaseModel, field_validator
import sys, os, uuid, logging

from utils.emailer import send_zone_critical_alert

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ai'))
from predict import run_full_pipeline

router = APIRouter()
logger = logging.getLogger(__name__)  # ✅ MINOR: proper logging


class StatusUpdate(BaseModel):
    status: str


class BulkUpdate(BaseModel):
    event_ids: list[str]
    status:    str


class TriggerRequest(BaseModel):
    zone_id:     str
    sightings:   list[dict]
    eps:         float = 0.5
    min_samples: int   = 2

    # ✅ FIX #5: validate sightings before they reach the AI pipeline
    @field_validator("sightings")
    @classmethod
    def validate_sightings(cls, v):
        if not v:
            raise ValueError("sightings list cannot be empty")
        for i, s in enumerate(v):
            lat = s.get("latitude") or s.get("lat")
            lon = s.get("longitude") or s.get("lon")
            if lat is None or lon is None:
                raise ValueError(f"Sighting #{i+1} is missing latitude or longitude")
            try:
                lat, lon = float(lat), float(lon)
            except (TypeError, ValueError):
                raise ValueError(f"Sighting #{i+1} has non-numeric coordinates")
            if not (-90 <= lat <= 90):
                raise ValueError(f"Sighting #{i+1} has invalid latitude: {lat}")
            if not (-180 <= lon <= 180):
                raise ValueError(f"Sighting #{i+1} has invalid longitude: {lon}")
        return v


# ── Get Detections ────────────────────────────────────
@router.get("/detections")
def get_detections(
    zone_id: str | None = Query(None),
    limit:   int        = Query(20, le=200),  # ✅ MINOR: cap results
    db: Session = Depends(get_db),
    _:  object  = Depends(get_current_user)
):
    query = db.query(Detection).order_by(Detection.detected_at.desc())
    if zone_id:
        query = query.filter(Detection.zone_id == zone_id)

    return [
        {
            "event_id":       d.event_id,
            "alert_id":       d.alert_id,
            "zone_id":        d.zone_id,
            "zone_name":      d.zone_name,
            "province":       d.province,
            "risk_level":     d.risk_level,
            "event_type":     d.event_type,
            "confidence":     d.confidence,
            "risk_score":     d.risk_score,
            "velocity":       d.velocity,
            "dbscan_clusters":d.dbscan_clusters,
            "description":    d.description,
            "status":         d.status,
            "detected_at":    d.detected_at,
        }
        for d in query.limit(limit).all()
    ]


# ── Update Detection Status ───────────────────────────
# ✅ FIX #4: restricted to admins only, with audit log
@router.patch("/detections/{event_id}")
def update_detection(
    event_id:     str,
    req:          StatusUpdate,
    db:           Session = Depends(get_db),
    current_user = Depends(require_analyst)
):
    detection = db.query(Detection).filter(Detection.event_id == event_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    old_status       = detection.status
    detection.status = req.status

    # ✅ FIX #4: log who changed what
    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = current_user.user_id,
        action_type = "DETECTION_STATUS_UPDATE",
        detail      = f"Detection {event_id} changed from '{old_status}' to '{req.status}'",
        timestamp   = datetime.now(timezone.utc)
    ))
    db.commit()

    return {"event_id": event_id, "status": req.status}


# ── Bulk Update ───────────────────────────────────────
# ✅ FIX #4: restricted to admins only, with audit log
@router.post("/detections/bulk")
def bulk_update(
    req:          BulkUpdate,
    db:           Session = Depends(get_db),
    current_user = Depends(require_analyst)
):
    updated = 0
    for event_id in req.event_ids:
        d = db.query(Detection).filter(Detection.event_id == event_id).first()
        if d:
            d.status = req.status
            updated += 1

    # ✅ FIX #4: single audit log entry for the whole bulk action
    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = current_user.user_id,
        action_type = "BULK_DETECTION_UPDATE",
        detail      = f"Bulk updated {updated} detection(s) to '{req.status}'",
        timestamp   = datetime.now(timezone.utc)
    ))
    db.commit()

    return {"updated": updated, "status": req.status}


# ── Trigger AI Detection ──────────────────────────────
@router.post("/detections/trigger")
def trigger_detection(
    req:          TriggerRequest,
    db:           Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    zone = db.query(Zone).filter(Zone.zone_id == req.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    risk = db.query(RiskParameter).filter(RiskParameter.zone_id == req.zone_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk parameters not found for this zone")

    try:
        result = run_full_pipeline(
            zone_id     = req.zone_id,
            sightings   = req.sightings,
            eps         = risk.sensitivity_weight,
            min_samples = risk.min_cluster_size
        )

        current_risk = result["current_risk"]
        risk_score   = result["current_score"]
        confidence   = result["current_score"]

        zone.risk_level    = current_risk
        zone.confidence    = confidence
        zone.last_detected = datetime.now(timezone.utc)

        if current_risk == "Critical":
            send_zone_critical_alert(
                db         = db,
                zone_name  = zone.zone_name,
                province   = zone.province,
                risk_score = risk_score,
                confidence = confidence,
            )

        weather = result["weather"]
        db.add(WeatherSnapshot(
            snapshot_id  = generate_id("snap"),
            zone_id      = req.zone_id,
            temperature  = weather["temperature"],
            wind_speed   = weather["wind_speed"],
            humidity     = weather["humidity"],
            rainfall_7day= weather["rainfall_7day"],
            source       = weather["source"],
            fetched_at   = datetime.now(timezone.utc)
        ))

        # ✅ FIX (race condition): UUID-based alert ID instead of COUNT()+1
        alert_id   = f"ALT-{uuid.uuid4().hex[:8].upper()}"
        event_type = "Locust Swarm" if result["current_swarm"] else "Monitoring"

        detection = Detection(
            event_id       = generate_id("evt"),
            alert_id       = alert_id,
            zone_id        = req.zone_id,
            zone_name      = zone.zone_name,
            province       = zone.province,
            risk_level     = current_risk,
            event_type     = event_type,
            confidence     = confidence,
            risk_score     = risk_score,
            dbscan_clusters= len(result["clusters"]),
            description    = (
                f"DBSCAN detected {len(result['clusters'])} cluster(s). "
                f"72hr forecast: {result['risk_72hr']} "
                f"({result['probability_72hr'] * 100:.1f}%)"
            ),
            status         = "Active",
            detected_at    = datetime.now(timezone.utc)
        )
        db.add(detection)

        db.add(ActivityLog(
            log_id      = generate_id("log"),
            user_id     = current_user.user_id,
            action_type = "DETECTION_TRIGGERED",
            detail      = f"Zone {zone.zone_name} — Risk: {current_risk}",
            timestamp   = datetime.now(timezone.utc)
        ))

        db.commit()  # ✅ FIX #5: single commit — all or nothing

    except ValueError as e:
        # Validation errors from the pipeline (bad data shape, etc.)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        db.rollback()  # ✅ FIX #5: roll back everything if pipeline crashes
        logger.exception("[detections] trigger pipeline failed")
        raise HTTPException(status_code=500, detail="Detection pipeline failed. No data was saved.")

    return {
        "message":     "Detection job complete",
        "alert_id":    alert_id,
        "zone":        zone.zone_name,
        "current_risk":current_risk,
        "risk_72hr":   result["risk_72hr"],
        "probability": result["probability_72hr"],
        "clusters":    len(result["clusters"]),
        "weather":     result["weather"]
    }
