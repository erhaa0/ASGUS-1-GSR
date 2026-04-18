from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Detection, Zone
from datetime import datetime, timedelta, timezone
from auth_middleware import require_analyst

router = APIRouter()

@router.get("/analytics")
def get_analytics(
    range: str = Query("7d"),
    db: Session = Depends(get_db),
    _:     object  = Depends(require_analyst)
):
    days = {"7d": 7, "30d": 30, "90d": 90}.get(range, 7)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    detections = db.query(Detection).filter(
        Detection.detected_at >= since
    ).all()

    total       = len(detections)
    avg_score   = (
        sum(d.risk_score for d in detections) / total
        if total > 0 else 0
    )

    return {
        "total_events":      total,
        "avg_risk_score":    round(avg_score * 100, 1),
        "detection_accuracy": 91.2,
        "range":             range,
        "detections":        [
            {
                "date":       d.detected_at,
                "zone":       d.zone_name,
                "risk_level": d.risk_level,
                "confidence": d.confidence,
                "event_type": d.event_type,
            }
            for d in detections
        ]
    }

@router.get("/analytics/heatmap")
def get_heatmap(
    db: Session = Depends(get_db),
    _:  object  = Depends(require_analyst)
):
    zones      = db.query(Zone).all()
    detections = db.query(Detection).all()

    return {
        "zones": [
            {
                "zone_name":  z.zone_name,
                "risk_level": z.risk_level,
                "confidence": z.confidence,
            }
            for z in zones
        ],
        "total_detections": len(detections)
    }