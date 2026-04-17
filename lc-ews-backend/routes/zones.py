from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Zone
from auth_middleware import get_current_user

router = APIRouter()

@router.get("/zones")
def get_zones(
    province:      str | None = Query(None),
    risk:          str | None = Query(None),
    status:        str | None = Query(None),
    assigned_to:   str | None = Query(None),
    db: Session = Depends(get_db),
    _:           object     = Depends(get_current_user) 
):
    query = db.query(Zone)

    if province:
        query = query.filter(Zone.province == province)
    if risk:
        query = query.filter(Zone.risk_level == risk)
    if status:
        query = query.filter(Zone.status == status)

    zones = query.all()
    return [
        {
            "zone_id":           z.zone_id,
            "zone_name":         z.zone_name,
            "province":          z.province,
            "lat":               z.lat,
            "lon":               z.lon,
            "risk_level":        z.risk_level,
            "confidence":        z.confidence,
            "status":            z.status,
            "sensitivity_weight":z.sensitivity_weight,
            "last_detected":     z.last_detected,
        }
        for z in zones
    ]

@router.get("/zones/{zone_id}")
def get_zone(zone_id: str, db: Session = Depends(get_db,),_:       object  = Depends(get_current_user) ):
    zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()
    if not zone:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Zone not found")
    return {
        "zone_id":           zone.zone_id,
        "zone_name":         zone.zone_name,
        "province":          zone.province,
        "lat":               zone.lat,
        "lon":               zone.lon,
        "risk_level":        zone.risk_level,
        "confidence":        zone.confidence,
        "status":            zone.status,
        "sensitivity_weight":zone.sensitivity_weight,
        "last_detected":     zone.last_detected,
    }