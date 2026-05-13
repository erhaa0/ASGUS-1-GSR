from database import engine, SessionLocal, Base, generate_id
from models.db_models import User, Zone, RiskParameter, ActivityLog, Detection, WeatherSnapshot
from passlib.context import CryptContext
from datetime import datetime, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    # DO NOT fail silently if DB is broken
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print("❌ DB connection failed:", e)
        return

    db = SessionLocal()

    print("=" * 50)
    print("LC-EWS - SEED START")
    print("=" * 50)

    # ───────── USERS ─────────
    users = [
        ("admin01", "Admin", "admin@gmail.com", "admin123", "admin", "ADMN-001", "Active", None),
        ("analyst01", "Wajiha", "wajiha@gmail.com", "analyst123", "analyst", "ANLST-001", "Active", None),
        ("field01", "Field Officer", "field@gmail.com", "field123", "field_officer", "FLDO-001", "Active", "quetta"),
    ]

    for u in users:
        obj = db.query(User).filter(User.user_id == u[0]).first()

        data = {
            "user_id":      u[0],
            "full_name":    u[1],
            "email":        u[2],
            "password":     pwd_context.hash(u[3]),
            "role":         u[4],
            "badge":        u[5],
            "status":       u[6],
            "assigned_zone":u[7],
        }

        if obj:
            for k, v in data.items():
                setattr(obj, k, v)
        else:
            db.add(User(**data))

    db.commit()
    print("✅ Users seeded")

    # ───────── ZONES ─────────
    zones = [
        ("quetta", "Quetta", "Balochistan", 30.18, 66.97, "Critical", 0.91, "Active", 1.2),
        ("kech",   "Kech",   "Balochistan", 26.01, 64.35, "Critical", 0.87, "Active", 1.1),
        ("zhob",   "Zhob",   "Balochistan", 31.34, 69.44, "High",     0.76, "Active", 1.0),
        ("pishin", "Pishin", "Balochistan", 30.58, 66.99, "Medium",   0.65, "Monitoring", 0.9),
        ("swat",   "Swat",   "KPK",         35.22, 72.43, "Critical", 0.93, "Active", 1.3),
        ("dir",    "Dir",    "KPK",         35.20, 71.87, "Low",      0.45, "Monitoring", 0.8),
    ]

    for z in zones:
        obj = db.query(Zone).filter(Zone.zone_id == z[0]).first()

        data = {
            "zone_id":           z[0],
            "zone_name":         z[1],
            "province":          z[2],
            "lat":               z[3],
            "lon":               z[4],
            "risk_level":        z[5],
            "confidence":        z[6],
            "status":            z[7],
            "sensitivity_weight":z[8],
        }

        if obj:
            for k, v in data.items():
                setattr(obj, k, v)
        else:
            db.add(Zone(**data))

    db.commit()
    print("✅ Zones seeded")

    # ───────── RISK PARAMS ─────────
    for z in zones:
        obj = db.query(RiskParameter).filter(RiskParameter.zone_id == z[0]).first()

        if obj:
            obj.min_cluster_size   = 2
            obj.sensitivity_weight = 1.0
            obj.updated_by         = "admin01"
        else:
            db.add(RiskParameter(
                zone_id            = z[0],
                min_cluster_size   = 2,
                sensitivity_weight = 1.0,
                updated_by         = "admin01"
            ))

    db.commit()
    print("✅ Risk parameters seeded")

    # ───────── WEATHER SNAPSHOTS ─────────
    # FIX: seed weather_snapshots so the table is not empty on first load
    weather_seeds = [
        ("quetta", 38.2, 18.5, 42.0, 12.3),
        ("kech",   40.1, 22.3, 38.0,  8.1),
        ("zhob",   35.6, 15.2, 50.0, 15.0),
        ("pishin", 33.4, 12.0, 55.0, 18.5),
        ("swat",   28.1, 10.5, 65.0, 25.0),
        ("dir",    25.3,  8.2, 70.0, 30.0),
    ]

    for (zone_id, temp, wind, humidity, rain) in weather_seeds:
        existing = db.query(WeatherSnapshot).filter(
            WeatherSnapshot.zone_id == zone_id
        ).first()
        if not existing:
            db.add(WeatherSnapshot(
                snapshot_id   = generate_id("snap"),
                zone_id       = zone_id,
                temperature   = temp,
                wind_speed    = wind,
                humidity      = humidity,
                rainfall_7day = rain,
                source        = "seeded",
                fetched_at    = datetime.now(timezone.utc)
            ))

    db.commit()
    print("✅ Weather snapshots seeded")

    # ───────── DETECTIONS ─────────
    # FIX: seed detections so the table is not empty on first load
    detection_seeds = [
        ("quetta", "Quetta", "Balochistan", "Critical", "Locust Swarm", 0.91, 0.91, 3,
         "DBSCAN detected 3 cluster(s). 72hr forecast: Critical (91.0%)"),
        ("swat",   "Swat",   "KPK",         "Critical", "Locust Swarm", 0.93, 0.93, 4,
         "DBSCAN detected 4 cluster(s). 72hr forecast: Critical (93.0%)"),
        ("kech",   "Kech",   "Balochistan", "High",     "Scout Group",  0.76, 0.76, 2,
         "DBSCAN detected 2 cluster(s). 72hr forecast: High (76.0%)"),
        ("zhob",   "Zhob",   "Balochistan", "High",     "Scout Group",  0.72, 0.72, 1,
         "DBSCAN detected 1 cluster(s). 72hr forecast: High (72.0%)"),
        ("pishin", "Pishin", "Balochistan", "Medium",   "Monitoring",   0.65, 0.65, 0,
         "No clusters detected. 72hr forecast: Medium (65.0%)"),
        ("dir",    "Dir",    "KPK",         "Low",      "Monitoring",   0.45, 0.45, 0,
         "No clusters detected. 72hr forecast: Low (45.0%)"),
    ]

    alert_counter = db.query(Detection).count()
    for (zone_id, zone_name, province, risk, etype, conf, score, clusters, desc) in detection_seeds:
        existing = db.query(Detection).filter(Detection.zone_id == zone_id).first()
        if not existing:
            alert_counter += 1
            db.add(Detection(
                event_id        = generate_id("evt"),
                alert_id        = f"ALT-{alert_counter:04d}",
                zone_id         = zone_id,
                zone_name       = zone_name,
                province        = province,
                risk_level      = risk,
                event_type      = etype,
                confidence      = conf,
                risk_score      = score,
                dbscan_clusters = clusters,
                description     = desc,
                status          = "Active",
                detected_at     = datetime.now(timezone.utc)
            ))

    db.commit()
    print("✅ Detections seeded")

    # ───────── ACTIVITY LOG ─────────
    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = "admin01",
        action_type = "SYSTEM_SEED",
        detail      = "Supabase sync seed completed",
        timestamp   = datetime.now(timezone.utc)
    ))

    db.commit()
    db.close()

    print("=" * 50)
    print("✅ SEED COMPLETE")
    print("=" * 50)


if __name__ == "__main__":
    seed()
