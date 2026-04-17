from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, generate_id
from models.db_models import RiskParameter, ActivityLog
from datetime import datetime, timezone
from pydantic import BaseModel
from auth_middleware import require_admin

router = APIRouter()

class RiskParamUpdate(BaseModel):
    min_cluster_size:   int   | None = None
    sensitivity_weight: float | None = None
    updated_by:         str   | None = None

@router.patch("/risk-params/{zone_id}")
def update_risk_params(zone_id: str, 
                       req: RiskParamUpdate,
                       db: Session = Depends(get_db),
                       _:       object  = Depends(require_admin)
    ):
    params = db.query(RiskParameter).filter(
        RiskParameter.zone_id == zone_id
    ).first()
    if not params:
        raise HTTPException(status_code=404, detail="Zone not found")

    if req.min_cluster_size:
        params.min_cluster_size = req.min_cluster_size
    if req.sensitivity_weight:
        params.sensitivity_weight = req.sensitivity_weight

    params.updated_by = req.updated_by or "admin01"
    params.updated_at = datetime.now(timezone.utc)

    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = params.updated_by,
        action_type = "RISK_PARAMS_UPDATED",
        detail      = f"Zone {zone_id} params updated",
        timestamp   = datetime.now(timezone.utc)
    ))
    db.commit()

    return {
        "zone_id":           zone_id,
        "min_cluster_size":  params.min_cluster_size,
        "sensitivity_weight":params.sensitivity_weight,
        "status":            "updated"
    }