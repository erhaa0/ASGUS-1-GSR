from database import engine, SessionLocal, Base, generate_id
from models.db_models import (User, Zone, RiskParameter, ActivityLog)
from passlib.context import CryptContext
from datetime import datetime, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("=" * 50)
    print("LC-EWS - Seeding Database")
    print("=" * 50)

    # ── Seed Users ────────────────────────────────────
    seeded_users = [
        dict(
            user_id="admin01",
            full_name="Admin",
            email="admin@gmail.com",
            password=pwd_context.hash("admin123"),
            role="admin",
            badge="ADMN-001",
            status="Active",
            assigned_zone=None,
        ),
        dict(
            user_id="analyst01",
            full_name="Wajiha",
            email="wajiha@gmail.com",
            password=pwd_context.hash("analyst123"),
            role="analyst",
            badge="ANLST-001",
            status="Active",
            assigned_zone=None,
        ),
        dict(
            user_id="field01",
            full_name="Field Officer",
            email="field@gmail.com",
            password=pwd_context.hash("field123"),
            role="field_officer",
            badge="FLDO-001",
            status="Active",
            assigned_zone="quetta",
        ),
    ]

    created = 0
    updated = 0
    for data in seeded_users:
        existing = db.query(User).filter(User.user_id == data["user_id"]).first()
        if not existing:
            db.add(User(**data))
            created += 1
            continue

        # Keep seeded accounts consistent across runs.
        for key, value in data.items():
            setattr(existing, key, value)
        updated += 1

    if created or updated:
        db.commit()
        print(f"[OK] Users seeded (created {created}, updated {updated})")
    else:
        print("[SKIP] Users already exist")

    # ── Seed Zones ────────────────────────────────────
    if db.query(Zone).count() == 0:
        zones = [
            Zone(
                zone_id            = "quetta",
                zone_name          = "Quetta",
                province           = "Balochistan",
                lat                = 30.18,
                lon                = 66.97,
                risk_level         = "Critical",
                confidence         = 0.91,
                status             = "Active",
                sensitivity_weight = 1.2
            ),
            Zone(
                zone_id            = "kech",
                zone_name          = "Kech",
                province           = "Balochistan",
                lat                = 26.01,
                lon                = 64.35,
                risk_level         = "Critical",
                confidence         = 0.87,
                status             = "Active",
                sensitivity_weight = 1.1
            ),
            Zone(
                zone_id            = "zhob",
                zone_name          = "Zhob",
                province           = "Balochistan",
                lat                = 31.34,
                lon                = 69.44,
                risk_level         = "High",
                confidence         = 0.76,
                status             = "Active",
                sensitivity_weight = 1.0
            ),
            Zone(
                zone_id            = "pishin",
                zone_name          = "Pishin",
                province           = "Balochistan",
                lat                = 30.58,
                lon                = 66.99,
                risk_level         = "Medium",
                confidence         = 0.65,
                status             = "Monitoring",
                sensitivity_weight = 0.9
            ),
            Zone(
                zone_id            = "swat",
                zone_name          = "Swat",
                province           = "KPK",
                lat                = 35.22,
                lon                = 72.43,
                risk_level         = "Critical",
                confidence         = 0.93,
                status             = "Active",
                sensitivity_weight = 1.3
            ),
            Zone(
                zone_id            = "dir",
                zone_name          = "Dir",
                province           = "KPK",
                lat                = 35.20,
                lon                = 71.87,
                risk_level         = "Low",
                confidence         = 0.45,
                status             = "Monitoring",
                sensitivity_weight = 0.8
            ),
        ]
        db.add_all(zones)
        print("[OK] Zones seeded (6 zones)")
    else:
        print("[SKIP] Zones already exist")

    # ── Seed Risk Parameters ──────────────────────────
    if db.query(RiskParameter).count() == 0:
        params = [
            RiskParameter(
                zone_id            = z,
                min_cluster_size   = 2,
                sensitivity_weight = 1.0,
                updated_by         = "admin01"
            )
            for z in ["quetta", "kech",
                      "zhob",   "pishin",
                      "swat",   "dir"]
        ]
        db.add_all(params)
        print("[OK] Risk parameters seeded")
    else:
        print("[SKIP] Risk parameters already exist")

    # ── Seed Activity Log ─────────────────────────────
    log = ActivityLog(
        log_id      = generate_id("log"),
        user_id     = "admin01",
        action_type = "SYSTEM_SEED",
        detail      = "Database initialized and seeded",
        timestamp   = datetime.now(timezone.utc)
    )
    db.add(log)

    db.commit()
    db.close()

    print("\n" + "=" * 50)
    print("[OK] Database seeded successfully!")
    print("   File: lc_ews.db")
    print("=" * 50)

if __name__ == "__main__":
    seed()