import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, timezone
from database import Base

def now_utc():
    return datetime.now(timezone.utc)

def gen_uuid():
    return str(uuid.uuid4())

# ───────────────────────── USERS ─────────────────────────
class User(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, default=gen_uuid)

    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

    role = Column(String, nullable=False)
    badge = Column(String)

    assigned_zone = Column(String)
    status = Column(String, default="Active")

    last_login = Column(DateTime)
    created_at = Column(DateTime, default=now_utc)

    preferences = Column(JSONB, nullable=True)   # FIXED (was TEXT)

# ───────────────────────── ZONES ─────────────────────────
class Zone(Base):
    __tablename__ = "zones"

    zone_id = Column(String, primary_key=True)

    zone_name = Column(String, nullable=False)
    province = Column(String, nullable=False)

    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)

    risk_level = Column(String, default="Low")
    confidence = Column(Float, default=0.0)

    status = Column(String, default="Monitoring")
    sensitivity_weight = Column(Float, default=1.0)

    last_detected = Column(DateTime)
    created_at = Column(DateTime, default=now_utc)

# ───────────────────────── DETECTIONS ─────────────────────────
class Detection(Base):
    __tablename__ = "detections"

    event_id = Column(String, primary_key=True, default=gen_uuid)

    alert_id = Column(String)
    zone_id = Column(String)
    zone_name = Column(String)
    province = Column(String)

    risk_level = Column(String)
    event_type = Column(String)

    confidence = Column(Float)
    risk_score = Column(Float)

    velocity = Column(String)
    dbscan_clusters = Column(Integer, default=0)

    description = Column(Text)
    status = Column(String, default="Active")

    detected_at = Column(DateTime, default=now_utc)

# ───────────────────────── OBSERVATIONS ─────────────────────────
class Observation(Base):
    __tablename__ = "observations"

    observation_id = Column(String, primary_key=True, default=gen_uuid)

    user_id = Column(String)
    zone_id = Column(String)
    zone_name = Column(String)

    event_type = Column(String)
    severity = Column(String)

    estimated_scale = Column(String)

    latitude = Column(Float)
    longitude = Column(Float)

    notes = Column(Text)
    photo_url = Column(String)

    status = Column(String, default="Submitted")
    submitted_at = Column(DateTime, default=now_utc)

# ───────────────────────── RISK PARAMETERS ─────────────────────────
class RiskParameter(Base):
    __tablename__ = "risk_parameters"

    zone_id = Column(String, primary_key=True)

    min_cluster_size = Column(Integer, default=2)
    sensitivity_weight = Column(Float, default=1.0)

    updated_by = Column(String)
    updated_at = Column(DateTime, default=now_utc)

# ───────────────────────── ACTIVITY LOG ─────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    log_id = Column(String, primary_key=True, default=gen_uuid)

    user_id = Column(String)
    action_type = Column(String)

    detail = Column(Text)

    timestamp = Column(DateTime, default=now_utc)

# ── 7. Weather Snapshots (DR-07) ──────────────────────
class WeatherSnapshot(Base):
    __tablename__ = "weather_snapshots"

    snapshot_id    = Column(String, primary_key=True)
    zone_id        = Column(String, nullable=False)
    temperature    = Column(Float, nullable=False)
    wind_speed     = Column(Float, nullable=False)
    humidity       = Column(Float, nullable=False)
    rainfall_7day  = Column(Float, nullable=False)
    source         = Column(String, default="live")
    fetched_at     = Column(DateTime, default=now_utc)

# ───────────────────────── HEALTH ─────────────────────────
class HealthSnapshot(Base):
    __tablename__ = "health_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=now_utc)

    api_ms = Column(Integer)
    db_ms = Column(Integer)
    ai_ms = Column(Integer)
    azure_ms = Column(Integer)
    postgis_ms = Column(Integer)

class HealthIncident(Base):
    __tablename__ = "health_incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=now_utc)

    service = Column(String)
    description = Column(Text)

    severity = Column(String, default="Medium")
    status = Column(String, default="Investigating")
