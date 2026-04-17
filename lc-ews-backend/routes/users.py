from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.db_models import User
from pydantic import BaseModel
from auth_middleware import require_admin
from database import generate_id
from models.db_models import ActivityLog
from auth_middleware import get_current_user
from datetime import datetime, timezone

router = APIRouter()

class UserUpdate(BaseModel):
    full_name:     str | None = None
    badge:         str | None = None
    assigned_zone: str | None = None

@router.get("/users")
def get_users(db: Session = Depends(get_db),_:  object  = Depends(require_admin)):
    users = db.query(User).all()
    return [
        {
            "user_id":      u.user_id,
            "full_name":    u.full_name,
            "email":        u.email,
            "role":         u.role,
            "badge":        u.badge,
            "status":       u.status,
            "last_login":   u.last_login,
            "assigned_zone":u.assigned_zone,
        }
        for u in users
    ]

@router.put("/users/{user_id}")
def update_user(user_id: str, req: UserUpdate,db: Session = Depends(get_db),_:  object  = Depends(require_admin)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.full_name:
        user.full_name = req.full_name
    if req.badge:
        user.badge = req.badge
    if req.assigned_zone:
        user.assigned_zone = req.assigned_zone
    db.commit()
    return {"user_id": user_id, "status": "updated"}

@router.patch("/users/{user_id}/status")
def update_status(user_id: str,db: Session = Depends(get_db),_: object  = Depends(require_admin)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = "Inactive" if user.status == "Active" else "Active"
    db.commit()
    return {"user_id": user_id, "status": user.status}
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class PasswordChange(BaseModel):
    current_password: str
    new_password:     str
    confirm_password: str

@router.put("/users/{user_id}/password")
def change_password(
    user_id: str,
    req:     PasswordChange,
    db:      Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.user_id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403,
            detail="You can only change your own password")

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_context.verify(req.current_password, user.password):
        raise HTTPException(status_code=400,
            detail="Current password is incorrect")

    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400,
            detail="New passwords do not match")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400,
            detail="Password must be at least 6 characters")

    user.password = pwd_context.hash(req.new_password)

    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = current_user.user_id,
        action_type = "PASSWORD_CHANGED",
        detail      = f"Password changed for {user_id}",
        timestamp   = datetime.now(timezone.utc)
    ))
    db.commit()

    return {"status": "Password updated successfully"}

# ── Field Officers list (accessible to all authenticated users) ───────────────
@router.get("/users/field-officers")
def get_field_officers(db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    officers = db.query(User).filter(
        User.role == "field_officer",
        User.status == "Active"
    ).all()
    return [
        {
            "user_id":       o.user_id,
            "full_name":     o.full_name,
            "badge":         o.badge,
            "assigned_zone": o.assigned_zone,
        }
        for o in officers
    ]

# ── User Preferences ──────────────────────────────────────────────────────────
import json

class PreferencesUpdate(BaseModel):
    preferences: str  # JSON string

@router.get("/users/{user_id}/preferences")
def get_preferences(
    user_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.user_id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    prefs = {}
    if user.preferences:
        try:
            prefs = json.loads(user.preferences)
        except Exception:
            prefs = {}
    return {"preferences": prefs}

@router.put("/users/{user_id}/preferences")
def update_preferences(
    user_id: str,
    req: PreferencesUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.user_id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.preferences = req.preferences
    db.commit()
    return {"status": "updated"}