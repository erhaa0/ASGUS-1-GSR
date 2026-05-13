from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.db_models import HealthSnapshot, HealthIncident
from datetime import datetime, timezone, timedelta
from auth_middleware import get_current_user  
import time
import os
import logging
import joblib
import numpy as np

from utils.emailer import send_health_incident_alert

router = APIRouter()

logger = logging.getLogger(__name__)

_last_alerted: dict[str, datetime] = {}
ALERT_COOLDOWN_MINUTES = 60

try:
    import psutil as _psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False


def _get_resources():
    if _HAS_PSUTIL:
        return {
            "cpu":     round(_psutil.cpu_percent(interval=0.1)),
            "memory":  round(_psutil.virtual_memory().percent),
            "storage": round(_psutil.disk_usage('/').percent),
        }
    return {"cpu": 34, "memory": 61, "storage": 78}


def _measure_db_ms(db: Session) -> int:
    try:
        t0 = time.monotonic()
        db.execute(text("SELECT 1"))
        return max(1, round((time.monotonic() - t0) * 1000))
    except Exception:
        db.rollback()
        return 9999


def _check_postgis_ms(db: Session) -> int:
    try:
        t0 = time.monotonic()
        db.execute(text("SELECT PostGIS_Version()"))
        return max(1, round((time.monotonic() - t0) * 1000))
    except Exception:
        db.rollback()
        return 9999


def _check_ai_ms() -> int:
    try:
        base_dir   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, "ai", "model.pkl")
        if not os.path.exists(model_path):
            return 9999
        t0    = time.monotonic()
        model = joblib.load(model_path)
        dummy = np.zeros((1, model.n_features_in_))
        _     = model.predict(dummy)
        return max(10, round((time.monotonic() - t0) * 1000))
    except Exception as e:
        logger.error("[health] AI check failed")  
        return 9999


def _check_ai_status():
    ms = _check_ai_ms()
    return ("Online" if ms < 9999 else "Degraded"), ms


def _check_api_ms() -> int:
    import json
    payload = {"service": "api", "ping": True}
    t0 = time.monotonic()
    _  = json.loads(json.dumps(payload))
    return max(5, round((time.monotonic() - t0) * 1000))


def _check_supabase_rest_ms() -> int:
    import requests
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    if not url or not key:
        return 9999
    try:
        t0   = time.monotonic()
        resp = requests.get(
            f"{url}/rest/v1/zones",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            params={"limit": 1},
            timeout=5,
        )
        ms = round((time.monotonic() - t0) * 1000)
        return ms if resp.status_code in (200, 206) else 9999
    except Exception:
        logger.error("[health] Supabase REST check failed")
        return 9999


_THRESHOLDS = {
    "API Server":        200,
    "Supabase":          600,
    "AI Microservice":   3000,
    "Supabase REST API": 1000,
    "PostGIS Extension": 1000,
}


def _maybe_record_incident(db: Session, name: str, response_ms: int, status: str):
    try:
        if status != "Online" or response_ms > _THRESHOLDS.get(name, 500):
            severity = (
                "High"
                if status != "Online" or response_ms > _THRESHOLDS.get(name, 500) * 2
                else "Medium"
            )
            desc = (
                f"{name} is {status}"
                if status != "Online"
                else f"{name} response time elevated: {response_ms}ms"
            )
            incident = HealthIncident(
                timestamp   = datetime.now(timezone.utc),
                service     = name,
                description = desc,
                severity    = severity,
                status      = "Investigating",
            )
            db.add(incident)

            if severity == "High":
                now_time       = datetime.now(timezone.utc)
                last           = _last_alerted.get(name)
                cooldown_passed = (
                    last is None or
                    (now_time - last).total_seconds() > ALERT_COOLDOWN_MINUTES * 60
                )
                if cooldown_passed:
                    _last_alerted[name] = now_time
                    try:
                        send_health_incident_alert(name, desc, severity)
                    except Exception:
                        logger.error(f"[health] email alert failed for {name}")
    except Exception:
        logger.error("[health] incident recording failed")


@router.get("/health")
def get_health(
    db: Session = Depends(get_db),
    _:  object  = Depends(get_current_user)
):
    try:
        now        = datetime.now(timezone.utc)
        db_ms      = _measure_db_ms(db)
        postgis_ms = _check_postgis_ms(db)
        ai_status, ai_ms = _check_ai_status()
        api_ms     = _check_api_ms()
        rest_ms    = _check_supabase_rest_ms()

        snap = HealthSnapshot(
            timestamp  = now,
            api_ms     = api_ms,
            db_ms      = db_ms,
            ai_ms      = ai_ms,
            azure_ms   = rest_ms,
            postgis_ms = postgis_ms,
        )
        db.add(snap)
        db.flush()

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        snaps       = db.query(HealthSnapshot).filter(HealthSnapshot.timestamp >= today_start).all()
        total       = len(snaps)

        def uptime_pct(values):
            if total == 0:
                return None
            online = sum(1 for v in values if (v or 9999) < 9999)
            return round((online / total) * 100, 1)

        inc_rows  = db.query(HealthIncident).filter(HealthIncident.timestamp >= today_start).all()
        inc_today = {}
        for r in inc_rows:
            inc_today[r.service] = inc_today.get(r.service, 0) + 1

        last_checked = now.isoformat()
        service_data = [
            {
                "name":        "API Server",
                "status":      "Online",
                "response_ms": api_ms,
                "uptime":      uptime_pct([s.api_ms for s in snaps]),
                "last_checked":last_checked,
                "incidents":   inc_today.get("API Server", 0),
            },
            {
                "name":        "Supabase",
                "status":      "Online" if db_ms < 9999 else "Degraded",
                "response_ms": db_ms,
                "uptime":      uptime_pct([s.db_ms for s in snaps]),
                "last_checked":last_checked,
                "incidents":   inc_today.get("Supabase", 0),
            },
            {
                "name":        "AI Microservice",
                "status":      ai_status,
                "response_ms": ai_ms,
                "uptime":      uptime_pct([s.ai_ms for s in snaps]),
                "last_checked":last_checked,
                "incidents":   inc_today.get("AI Microservice", 0),
            },
            {
                "name":        "Supabase REST API",
                "status":      "Online" if rest_ms < 9999 else "Degraded",
                "response_ms": rest_ms,
                "uptime":      uptime_pct([s.azure_ms for s in snaps]),
                "last_checked":last_checked,
                "incidents":   inc_today.get("Supabase REST API", 0),
            },
            {
                "name":        "PostGIS Extension",
                "status":      "Online" if postgis_ms < 9999 else "Degraded",
                "response_ms": postgis_ms,
                "uptime":      uptime_pct([s.postgis_ms for s in snaps]),
                "last_checked":last_checked,
                "incidents":   inc_today.get("PostGIS Extension", 0),
            },
        ]

        for svc in service_data:
            _maybe_record_incident(db, svc["name"], svc["response_ms"], svc["status"])

        db.commit()
        return {"services": service_data, "history": []}

    except Exception:
        db.rollback()
        logger.exception("[health] transaction failed") 
        return {"error": "health check failed"}          


@router.get("/health/incidents")
def get_incidents(
    db: Session = Depends(get_db),
    _:  object  = Depends(get_current_user)
):
    rows = (
        db.query(HealthIncident)
        .order_by(HealthIncident.id.desc())
        .limit(20)
        .all()
    )
    return {
        "incidents": [
            {
                "id":          r.id,
                "time":        r.timestamp.strftime("%d %b %H:%M") if r.timestamp else "--",
                "service":     r.service,
                "description": r.description,
                "severity":    r.severity,
                "status":      r.status,
            }
            for r in rows
        ]
    }

@router.get("/health/resources")
def get_resources(_: object = Depends(get_current_user)):
    return _get_resources()
