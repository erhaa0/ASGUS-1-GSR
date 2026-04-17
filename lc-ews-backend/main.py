from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from database import engine, Base
from routes import auth, zones, detections, observations, reports, users, logs, analytics, health, risk_params

Base.metadata.create_all(bind=engine)

# ── Migrate existing databases: add new columns if missing ────────────────────
from sqlalchemy import text
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN preferences TEXT"))
        conn.commit()
    except Exception:
        pass  # Column already exists

app = FastAPI(
    title       = "ASGUS-1 GSR Backend",
    description = "AI-Powered Locust Early Warning System API",
    version     = "1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.include_router(auth.router,         prefix="/api")
app.include_router(zones.router,        prefix="/api")
app.include_router(detections.router,   prefix="/api")
app.include_router(observations.router, prefix="/api")
app.include_router(reports.router,      prefix="/api")
app.include_router(users.router,        prefix="/api")
app.include_router(logs.router,         prefix="/api")
app.include_router(analytics.router,    prefix="/api")
app.include_router(health.router,       prefix="/api")
app.include_router(risk_params.router,  prefix="/api")

@app.get("/")
def root():
    return {
        "system":  "ASGUS-1 GSR",
        "status":  "online",
        "version": "1.0.0",
        "docs":    "/docs"
    }

# ── This adds the Authorize button to Swagger ─────────
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title       = app.title,
        version     = app.version,
        description = app.description,
        routes      = app.routes,
    )

    schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type":         "http",
            "scheme":       "bearer",
            "bearerFormat": "JWT",
        }
    }

    # Apply security to all routes except login/register
    for path, methods in schema["paths"].items():
        if path not in ["/api/auth/login", "/api/auth/register", "/"]:
            for method in methods.values():
                method["security"] = [{"BearerAuth": []}]

    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi