# ASGUS-1 GSR — Ground Surveillance Radar

> Intelligent Terrain Movement Detection System for Agricultural Security
> Government of Pakistan · Ministry of National Food Security

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2BPostGIS-336791?logo=postgresql)
![Azure](https://img.shields.io/badge/Cloud-Microsoft%20Azure-0078D4?logo=microsoftazure)
![License](https://img.shields.io/badge/License-Academic-orange)

---

## Overview

ASGUS-1 GSR is a full-stack intelligent surveillance system designed to detect and monitor locust swarm invasions across **Balochistan** and **Khyber Pakhtunkhwa (KPK)** provinces of Pakistan. The system processes multi-temporal satellite imagery using AI to identify terrain movement signatures, delivers real-time alerts to government analysts, and coordinates field response operations — all through a secure role-based web platform.


---

## Features

### Intelligence Analyst Dashboard
- Interactive Leaflet map with 6 live detection zones across Balochistan and KPK
- Real-time alert feed with risk classification (Critical / High / Medium / Low)
- Layer toggles: Terrain, Heatmap, Satellite, Vegetation
- Time filters: 1H / 6H / 24H / 7D / ALL
- Zone detail pages with risk trend charts and event history
- On-demand PDF report generation

### Field Officer Portal
- Mobile-friendly observation submission form
- GPS auto-fill with zone centroid coordinates
- Photo upload with Azure Blob Storage
- Observation history with status tracking (Submitted / Reviewed / Flagged)

### Admin Panel
- Full user management with role-based access control
- AI detection job triggering per zone
- System health monitoring (API, DB, AI Microservice, Azure services)
- Activity audit log with date filtering

### AI Microservice
- Multi-temporal satellite image differencing
- DBSCAN clustering for swarm signature detection
- Random Forest 72-hour risk prediction
- Open-Meteo weather data integration
- Sub-30 second processing target

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Leaflet.js, Recharts, Three.js, Lucide React |
| Backend | Python, FastAPI, Uvicorn, SQLAlchemy, JWT Auth |
| AI Microservice | scikit-learn (DBSCAN + Random Forest), NumPy, Pillow |
| Database | PostgreSQL with PostGIS extension |
| Cloud | Supabase,Vercel,Render |
| Fonts | Space Grotesk and Space Mono |

---

## Project Structure

```
asgus1-gsr/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AnalystDashboard.jsx
│   │   │   ├── ZoneDetailPage.jsx
│   │   │   ├── AlertFeedPage.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── ZoneExplorerPage.jsx
│   │   │   ├── FieldOfficerDashboard.jsx
│   │   │   ├── AdminPanel.jsx
│   │   │   ├── SystemHealthPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── components/
│   │   │   ├── Topbar.jsx
│   │   │   └── Sidebar.jsx
│   │   └── context/
│   └── public/
│       └── logo.svg
├── backend/
│   ├── main.py
│   ├── routers/
│   ├── models/
│   ├── schemas/
│   └── requirements.txt
├── ai_service/
│   ├── ai_service.py
│   ├── clustering/
│   ├── prediction/
│   └── requirements.txt
└── database/
    ├── schema.sql
    └── seed.sql
```

---

## Monitored Zones

| Zone | Province | Risk Level |
|------|----------|------------|
| Quetta | Balochistan | Critical |
| Kech | Balochistan | Critical |
| Zhob | Balochistan | High |
| Pishin | Balochistan | Medium |
| Swat | KPK | Critical |
| Dir | KPK | Low |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ with PostGIS extension
- Supabase+Vercel and render(for deployment)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Runs on `http://localhost:3000`

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Runs on `http://localhost:8000`
API docs at `http://localhost:8000/docs`

### AI Microservice

```bash
cd ai_service
pip install -r requirements.txt
uvicorn ai_service:app --port 8001 --reload
```

Runs on `http://localhost:8001`

### Database

```bash
psql -U postgres -c "CREATE DATABASE asgus1;"
psql -U postgres -d asgus1 -c "CREATE EXTENSION postgis;"
psql -U postgres -d asgus1 -f database/schema.sql
psql -U postgres -d asgus1 -f database/seed.sql
```

---

## User Roles

| Role | Access | Accent Color |
|------|--------|--------------|
| Intelligence Analyst | Dashboard, Alerts, Zones, Analytics, Reports | Amber |
| Field Officer | Observation submission, History, Assigned zones | Green |
| Administrator | All pages + User management + System health | Blue |

---

## Environment Variables

### Frontend `.env`
```
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_API_TIMEOUT=30000
```

### Backend `.env`
```

JWT_SECRET_KEY=asgus_secret_key_2026

NEXT_PUBLIC_SUPABASE_URL=https://viazkdqsckkbrwervpgp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_0NVTWQMfMK1-D3MLxwmNAg_nbRIP2ug

DATABASE_URL=postgresql://postgres.viazkdqsckkbrwervpgp:<Password>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres


---

## API Overview

Full documentation available at `/docs` when backend is running.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Authenticate user and return JWT |
| GET | `/api/zones` | All monitored zones |
| GET | `/api/detections` | Recent detection events |
| POST | `/api/detections/trigger` | Trigger AI job for a zone |
| POST | `/api/observations` | Submit field observation |
| GET | `/api/reports` | List generated reports |
| GET | `/api/analytics` | Chart and trend data |
| GET | `/api/health` | System health status |
