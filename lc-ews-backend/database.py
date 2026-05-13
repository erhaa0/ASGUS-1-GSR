import os
import uuid
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ───────── LOAD ENV ─────────
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL not set in .env")

# ───────── ENGINE ─────────
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
    # ⚠️ Removed pool_size, max_overflow for Supabase (serverless friendly)
)

# ───────── SESSION ─────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ───────── BASE ─────────
Base = declarative_base()

# ───────── DB DEPENDENCY ─────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ───────── ID GENERATOR ─────────
def generate_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"
