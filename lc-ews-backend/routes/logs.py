from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import ActivityLog
from auth_middleware import require_admin

router = APIRouter()

@router.get("/logs")
def get_logs(
    limit: int       = Query(30),
    db: Session = Depends(get_db),
    _:     object  = Depends(require_admin)
):
    logs = db.query(ActivityLog).order_by(
        ActivityLog.timestamp.desc()
    ).limit(limit).all()

    return [
        {
            "log_id":      l.log_id,
            "user_id":     l.user_id,
            "action_type": l.action_type,
            "detail":      l.detail,
            "timestamp":   l.timestamp,
        }
        for l in logs
    ]