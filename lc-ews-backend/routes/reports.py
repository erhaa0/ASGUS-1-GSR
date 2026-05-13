from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import get_db, generate_id
from models.db_models import Detection, Zone, ActivityLog
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from auth_middleware import get_current_user
import io
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_ROLES = {"admin", "analyst", "field_officer"}


@router.get("/reports/{zone_id}")
def generate_report(
    zone_id: str,
    db:      Session = Depends(get_db),
    user     = Depends(get_current_user)
):
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")

    # ✅ Field officers can only generate reports for their own zone
    if user.role == "field_officer" and zone_id != user.assigned_zone:
        raise HTTPException(
            status_code=403,
            detail="You can only generate reports for your assigned zone"
        )

    zone = db.query(Zone).filter(Zone.zone_id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    detections = db.query(Detection).filter(
        Detection.zone_id == zone_id
    ).order_by(Detection.detected_at.desc()).limit(10).all()

    # ── Generate PDF ──────────────────────────────────
    buffer = io.BytesIO()
    p      = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    p.setFont("Helvetica-Bold", 20)
    p.drawString(50, height - 60, "ASGUS-1 GSR — Zone Risk Report")

    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, height - 100, f"Zone: {zone.zone_name}")
    p.setFont("Helvetica", 12)
    p.drawString(50, height - 125, f"Province    : {zone.province}")
    p.drawString(50, height - 145, f"Risk Level  : {zone.risk_level}")
    p.drawString(50, height - 165, f"Confidence  : {zone.confidence * 100:.1f}%")
    p.drawString(50, height - 185, f"Status      : {zone.status}")
    p.drawString(50, height - 205,
        f"Generated   : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
    )

    p.setFont("Helvetica-Bold", 13)
    p.drawString(50, height - 240, "Recent Detections:")
    p.setFont("Helvetica", 11)

    y = height - 265
    for d in detections:
        if y < 80:
            p.showPage()
            y = height - 60
        p.drawString(60, y,
            f"{d.alert_id} | {d.risk_level} | "
            f"{d.event_type} | {d.confidence*100:.0f}% | "
            f"{d.detected_at.strftime('%Y-%m-%d') if d.detected_at else 'N/A'}"
        )
        y -= 22

    p.save()
    buffer.seek(0)

    db.add(ActivityLog(
        log_id      = generate_id("log"),
        user_id     = user.user_id,
        action_type = "REPORT_EXPORTED",
        detail      = f"PDF report for {zone.zone_name}",
        timestamp   = datetime.now(timezone.utc)
    ))
    db.commit()

    return StreamingResponse(
        buffer,
        media_type = "application/pdf",
        headers    = {
            "Content-Disposition":
                f"attachment; filename=zone_{zone_id}_report.pdf"
        }
    )


@router.get("/reports")
def get_reports(
    db:   Session = Depends(get_db),
    user  = Depends(get_current_user)
):
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Access denied")

    # ── Fetch logs ────────────────────────────────────
    query = db.query(ActivityLog).filter(
        ActivityLog.action_type == "REPORT_EXPORTED"
    )

    # ✅ Field officers only see their own report history
    if user.role == "field_officer":
        query = query.filter(ActivityLog.user_id == user.user_id)

    logs = query.order_by(ActivityLog.timestamp.desc()).all()

    if not logs:
        return []

    # ✅ FIX N+1: collect all zone names first, then fetch all matching
    # zones in ONE query instead of one query per log row
    zone_names = {
        l.detail.replace("PDF report for ", "")
        for l in logs
        if l.detail
    }

    zones_map = {
        z.zone_name: z
        for z in db.query(Zone).filter(
            Zone.zone_name.in_(zone_names)
        ).all()
    }
    # Total DB queries: 2 (logs + zones) regardless of how many rows

    results = []
    for l in logs:
        zone_name = l.detail.replace("PDF report for ", "") if l.detail else ""
        zone      = zones_map.get(zone_name)
        results.append({
            "log_id":     l.log_id,
            "detail":     l.detail,
            "timestamp":  l.timestamp,
            "risk_level": zone.risk_level if zone else "Unknown",
        })

    return results
