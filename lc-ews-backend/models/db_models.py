from sqlalchemy import (Column, String, Float, 
                        Integer, DateTime, Text, Boolean)
from datetime import datetime
from database import Base

# ── 1. Users ──────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    user_id      = Column(String, primary_key=True)
    full_name    = Column(String, nullable=False)
    email        = Column(String, unique=True, nullable=False)
    password     = Column(String, nullable=False)  # bcrypt hashed
    role         = Column(String, nullable=False)  # analyst/admin/field_officer
    badge        = Column(String, nullable=True)
    assigned_zone= Column(String, nullable=True)   # for field officers
    status       = Column(String, default="Active")
    last_login   = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    preferences  = Column(Text, nullable=True)     # JSON string for user preferences

# ── 2. Zones ──────────────────────────────────────────
class Zone(Base):
    __tablename__ = "zones"

    zone_id            = Column(String, primary_key=True)
    zone_name          = Column(String, nullable=False)
    province           = Column(String, nullable=False)
    lat                = Column(Float, nullable=False)
    lon                = Column(Float, nullable=False)
    risk_level         = Column(String, default="Low")
    confidence         = Column(Float, default=0.0)
    status             = Column(String, default="Monitoring")
    sensitivity_weight = Column(Float, default=1.0)
    last_detected      = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)

# ── 3. Detections (Alert Events) ─────────────────────
class Detection(Base):
    __tablename__ = "detections"

    event_id         = Column(String, primary_key=True)
    alert_id         = Column(String, nullable=False)  # ALT-XXXX
    zone_id          = Column(String, nullable=False)
    zone_name        = Column(String, nullable=False)
    province         = Column(String, nullable=False)
    risk_level       = Column(String, nullable=False)
    event_type       = Column(String, nullable=False)
    confidence       = Column(Float, nullable=False)
    risk_score       = Column(Float, nullable=False)
    velocity         = Column(String, nullable=True)
    dbscan_clusters  = Column(Integer, default=0)
    description      = Column(Text, nullable=True)
    status           = Column(String, default="Active")
    detected_at      = Column(DateTime, default=datetime.utcnow)

# ── 4. Field Observations ─────────────────────────────
class Observation(Base):
    __tablename__ = "observations"

    observation_id   = Column(String, primary_key=True)
    user_id          = Column(String, nullable=False)
    zone_id          = Column(String, nullable=False)
    zone_name        = Column(String, nullable=False)
    event_type       = Column(String, nullable=False)
    severity         = Column(String, nullable=False)
    estimated_scale  = Column(String, nullable=True)
    latitude         = Column(Float, nullable=True)
    longitude        = Column(Float, nullable=True)
    notes            = Column(Text, nullable=True)
    photo_url        = Column(String, nullable=True)
    status           = Column(String, default="Submitted")
    submitted_at     = Column(DateTime, default=datetime.utcnow)

# ── 5. Risk Parameters ────────────────────────────────
class RiskParameter(Base):
    __tablename__ = "risk_parameters"

    zone_id          = Column(String, primary_key=True)
    min_cluster_size = Column(Integer, default=2)
    sensitivity_weight= Column(Float, default=1.0)
    updated_by       = Column(String, nullable=True)
    updated_at       = Column(DateTime, default=datetime.utcnow)

# ── 6. Activity Logs ──────────────────────────────────
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    log_id       = Column(String, primary_key=True)
    user_id      = Column(String, nullable=False)
    action_type  = Column(String, nullable=False)
    detail       = Column(Text, nullable=True)
    timestamp    = Column(DateTime, default=datetime.utcnow)

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
    fetched_at     = Column(DateTime, default=datetime.utcnow)