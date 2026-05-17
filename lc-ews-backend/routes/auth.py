from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db, generate_id
from models.db_models import User, ActivityLog
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, field_validator
import os
from auth_middleware import require_admin, SECRET_KEY

router      = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM   = "HS256"

# ✅ FIX: only these roles are allowed — nothing else accepted
VALID_ROLES = {"field_officer", "analyst", "admin"}

# ✅ FIX: minimum password length
MIN_PASSWORD_LENGTH = 4

ROLE_MAP = {
    "field_officer": "field-officer",
    "analyst":       "analyst",
    "admin":         "admin"
}


class LoginRequest(BaseModel):
    email:    str
    password: str


class RegisterRequest(BaseModel):
    full_name:     str
    email:         str
    password:      str
    role:          str
    badge:         str | None = None
    assigned_zone: str | None = None

    # ✅ FIX: validate role at the schema level — rejects before the DB is touched
    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v):
        if v not in VALID_ROLES:
            raise ValueError(
                f"Invalid role '{v}'. "
                f"Must be one of: {sorted(VALID_ROLES)}"
            )
        return v

    # ✅ FIX: blank or short passwords rejected
    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v):
        if not v or not v.strip():
            raise ValueError("Password cannot be blank")
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
            )
        return v

    # ✅ FIX: basic email sanity check
    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, v):
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v


def create_token(data: dict):
    expire = datetime.utcnow() + timedelta(hours=24)
    data.update({"exp": expire})
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


# ── Login ─────────────────────────────────────────────
@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()

    if not user or not pwd_context.verify(req.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if user.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    user.last_login = datetime.now(timezone.utc)

    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = user.user_id,
        action_type = "LOGIN",
        detail      = f"{user.role} logged in",
        timestamp   = datetime.now(timezone.utc)
    ))
    db.commit()

    token = create_token({
        "user_id": user.user_id,
        "role":    user.role,
        "email":   user.email
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "role":         ROLE_MAP.get(user.role, user.role),
        "user_id":      user.user_id,
        "name":         user.full_name,
        "badge":        user.badge
    }


# ── Register (Admin only) ─────────────────────────────
@router.post("/auth/register")
def register(
    req: RegisterRequest,
    db:  Session = Depends(get_db),
    _:   object  = Depends(require_admin)
):

    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        user_id       = generate_id("usr"),
        full_name     = req.full_name.strip(),
        email         = req.email,
        password      = pwd_context.hash(req.password),
        role          = req.role,
        badge         = req.badge or f"USR-{generate_id('')[4:8].upper()}",
        assigned_zone = req.assigned_zone,
        status        = "Active"
    )
    db.add(user)
    db.commit()

    return {
        "user_id": user.user_id,
        "email":   user.email,
        "role":    ROLE_MAP.get(user.role, user.role),
        "status":  "created"
    }
