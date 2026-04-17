from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db, generate_id
from models.db_models import Detection, Zone, WeatherSnapshot, ActivityLog
from auth_middleware import get_current_user, require_admin
from datetime import datetime, timezone
from pydantic import BaseModel
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ai'))
from predict import run_full_pipeline


router = APIRouter()

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

# ── Get Detections ────────────────────────────────────
@router.get("/detections")
def get_detections(
    zone_id: str | None = Query(None),
    limit:   int        = Query(20),
    db: Session = Depends(get_db),
    _:       object     = Depends(get_current_user)
):
    query = db.query(Detection).order_by(
        Detection.detected_at.desc()
    )
    if zone_id:
        query = query.filter(Detection.zone_id == zone_id)

    detections = query.limit(limit).all()
    return [
        {
            "event_id":        d.event_id,
            "alert_id":        d.alert_id,
            "zone_id":         d.zone_id,
            "zone_name":       d.zone_name,
            "province":        d.province,
            "risk_level":      d.risk_level,
            "event_type":      d.event_type,
            "confidence":      d.confidence,
            "risk_score":      d.risk_score,
            "velocity":        d.velocity,
            "dbscan_clusters": d.dbscan_clusters,
            "description":     d.description,
            "status":          d.status,
            "detected_at":     d.detected_at,
        }
        for d in detections
    ]

# ── Update Detection Status ───────────────────────────
@router.patch("/detections/{event_id}")
def update_detection(
    event_id: str,
    req: StatusUpdate,
    db: Session = Depends(get_db),
    _:        object  = Depends(get_current_user)
):
    detection = db.query(Detection).filter(
        Detection.event_id == event_id
    ).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    detection.status = req.status
    db.commit()
    return {"event_id": event_id, "status": req.status}

# ── Bulk Update ───────────────────────────────────────
@router.post("/detections/bulk")
def bulk_update(req: BulkUpdate, db: Session = Depends(get_db),_:   object  = Depends(get_current_user) ):
    updated = 0
    for event_id in req.event_ids:
        d = db.query(Detection).filter(
            Detection.event_id == event_id
        ).first()
        if d:
            d.status = req.status
            updated += 1
    db.commit()
    return {"updated": updated, "status": req.status}

# ── Trigger AI Detection ──────────────────────────────
@router.post("/detections/trigger")
def trigger_detection(req: TriggerRequest,
                      db: Session = Depends(get_db),_:   object  = Depends(require_admin)):
    zone = db.query(Zone).filter(
        Zone.zone_id == req.zone_id
    ).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Run full AI pipeline
    result = run_full_pipeline(
        zone_id    = req.zone_id,
        sightings  = req.sightings,
        eps        = req.eps,
        min_samples= req.min_samples
    )

    # Update zone risk level
    zone.risk_level    = result["current_risk"]
    zone.confidence    = result["current_score"]
    zone.last_detected = datetime.now(timezone.utc)

    # Save weather snapshot (DR-07)
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

    # Save detection event
    alert_num  = db.query(Detection).count() + 1
    alert_id   = f"ALT-{alert_num:04d}"
    event_type = "Locust Swarm" if result["current_swarm"] else "Monitoring"

    detection = Detection(
        event_id        = generate_id("evt"),
        alert_id        = alert_id,
        zone_id         = req.zone_id,
        zone_name       = zone.zone_name,
        province        = zone.province,
        risk_level      = result["current_risk"],
        event_type      = event_type,
        confidence      = result["current_score"],
        risk_score      = result["current_score"],
        dbscan_clusters = len(result["clusters"]),
        description     = (
            f"DBSCAN detected {len(result['clusters'])} cluster(s). "
            f"72hr forecast: {result['risk_72hr']} "
            f"({result['probability_72hr']*100:.1f}%)"
        ),
        status          = "Active",
        detected_at     = datetime.now(timezone.utc)
    )
    db.add(detection)

    # Log action
    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = "admin01",
        action_type = "DETECTION_TRIGGERED",
        detail      = f"Zone {zone.zone_name} — Risk: {result['current_risk']}",
        timestamp   = datetime.now(timezone.utc)
    ))

    db.commit()

    return {
        "message":      "Detection job complete",
        "alert_id":     alert_id,
        "zone":         zone.zone_name,
        "current_risk": result["current_risk"],
        "risk_72hr":    result["risk_72hr"],
        "probability":  result["probability_72hr"],
        "clusters":     len(result["clusters"]),
        "weather":      result["weather"]
    }