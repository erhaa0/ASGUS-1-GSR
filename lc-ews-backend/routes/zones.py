from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import Zone
from auth_middleware import get_current_user

router = APIRouter()


@router.get("/zones")
def get_zones(
    province: str | None = Query(None),
    risk:     str | None = Query(None),
    status:   str | None = Query(None),
    limit:    int        = Query(50, le=200),  # ✅ pagination cap
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)   # ✅ capture user for role check
):
    query = db.query(Zone)

    # ✅ MAJOR FIX: field officers only see their own assigned zone
    if current_user.role == "field_officer":
        if not current_user.assigned_zone:
            # officer has no zone assigned yet — return empty list, not everything
            return []
        query = query.filter(Zone.zone_id == current_user.assigned_zone)
    else:
        # admins and analysts can filter freely
        if province:
            query = query.filter(Zone.province == province)
        if risk:
            query = query.filter(Zone.risk_level == risk)
        if status:
            query = query.filter(Zone.status == status)

    zones = query.limit(limit).all()

    return [
        {
            "zone_id":            z.zone_id,
            "zone_name":          z.zone_name,
            "province":           z.province,
            "lat":                z.lat,
            "lon":                z.lon,
            "risk_level":         z.risk_level,
            "confidence":         z.confidence,
            "status":             z.status,
            "sensitivity_weight": z.sensitivity_weight,
            "last_detected":      z.last_detected,
        }
        for z in zones
    ]


@router.get("/zones/{zone_id}")
def get_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)   # ✅ capture user for role check
):
    zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()

    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # ✅ MAJOR FIX: field officers can only fetch their own zone
    if (current_user.role == "field_officer"
            and zone_id != current_user.assigned_zone):
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to this zone"
        )

    return {
        "zone_id":            zone.zone_id,
        "zone_name":          zone.zone_name,
        "province":           zone.province,
        "lat":                zone.lat,
        "lon":                zone.lon,
        "risk_level":         zone.risk_level,
        "confidence":         zone.confidence,
        "status":             zone.status,
        "sensitivity_weight": zone.sensitivity_weight,
        "last_detected":      zone.last_detected,
    }
