from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, generate_id
from models.db_models import RiskParameter, ActivityLog
from datetime import datetime, timezone
from pydantic import BaseModel
from auth_middleware import get_current_user

router = APIRouter()

class RiskParamUpdate(BaseModel):
    min_cluster_size:   int   | None = None
    sensitivity_weight: float | None = None
    updated_by:         str   | None = None

@router.get("/risk-params/{zone_id}")
def get_risk_params(zone_id: str, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    params = db.query(RiskParameter).filter(RiskParameter.zone_id == zone_id).first()
    if not params:
        raise HTTPException(status_code=404, detail="Zone not found")
    return {
        "zone_id":            params.zone_id,
        "min_cluster_size":   params.min_cluster_size,
        "sensitivity_weight": params.sensitivity_weight,
        "updated_by":         params.updated_by,
        "updated_at":         params.updated_at,
    }

@router.get("/risk-params")
def get_all_risk_params(db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    return [
        {"zone_id": p.zone_id, "min_cluster_size": p.min_cluster_size,
         "sensitivity_weight": p.sensitivity_weight, "updated_by": p.updated_by, "updated_at": p.updated_at}
        for p in db.query(RiskParameter).all()
    ]

@router.patch("/risk-params/{zone_id}")
def update_risk_params(zone_id: str, req: RiskParamUpdate,
                       db: Session = Depends(get_db),
                       current_user: object = Depends(get_current_user)):
    print(f"[PATCH /risk-params/{zone_id}] user={current_user.user_id} role={current_user.role}")
    print(f"[PATCH /risk-params/{zone_id}] payload: min_cluster={req.min_cluster_size} sensitivity={req.sensitivity_weight}")

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail=f"Admin role required. Your role is: {current_user.role}")

    params = db.query(RiskParameter).filter(RiskParameter.zone_id == zone_id).first()
    if not params:
        params = RiskParameter(zone_id=zone_id, min_cluster_size=2, sensitivity_weight=1.0, updated_by=current_user.user_id)
        db.add(params)
        db.flush()

    print(f"[PATCH] BEFORE: min_cluster={params.min_cluster_size} sensitivity={params.sensitivity_weight}")

    if req.min_cluster_size is not None:
        params.min_cluster_size = req.min_cluster_size
    if req.sensitivity_weight is not None:
        params.sensitivity_weight = req.sensitivity_weight

    params.updated_by = req.updated_by or current_user.user_id
    params.updated_at = datetime.now(timezone.utc)

    db.add(ActivityLog(
        log_id=generate_id("log"), user_id=params.updated_by,
        action_type="RISK_PARAMS_UPDATED",
        detail=f"Zone {zone_id}: min_cluster={params.min_cluster_size}, sensitivity={params.sensitivity_weight}",
        timestamp=datetime.now(timezone.utc)
    ))

    db.commit()
    db.refresh(params)

    print(f"[PATCH] AFTER commit+refresh: min_cluster={params.min_cluster_size} sensitivity={params.sensitivity_weight}")

    return {
        "zone_id":            zone_id,
        "min_cluster_size":   params.min_cluster_size,
        "sensitivity_weight": params.sensitivity_weight,
        "updated_by":         params.updated_by,
        "status":             "updated"
    }
