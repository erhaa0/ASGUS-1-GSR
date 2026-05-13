import joblib
import json
import logging
import numpy as np
import requests
from pathlib import Path
from dbscan_engine import run_dbscan

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────
BASE_DIR     = Path(__file__).resolve().parent
MODEL_PATH   = BASE_DIR / "model.pkl"
METRICS_PATH = BASE_DIR / "model_metrics.json"

# ── Load model once at import time ───────────────────
model = joblib.load(MODEL_PATH)
logger.info("Random Forest model loaded")

# ── Load real model metrics saved by train.py ────────
# ✅ FIX: replaces the hardcoded 91.2% with real computed values
def _load_metrics() -> dict:
    if not METRICS_PATH.exists():
        logger.warning(
            "model_metrics.json not found. "
            "Re-run train.py to generate real metrics."
        )
        return {
            "accuracy":         None,
            "precision":        None,
            "recall":           None,
            "f1_score":         None,
            "test_sample_size": None,
            "note": "Metrics file missing — retrain the model to generate real values."
        }
    with open(METRICS_PATH) as f:
        metrics = json.load(f)
    logger.info(
        f"Model metrics loaded | "
        f"Accuracy: {metrics.get('accuracy', 'N/A')}"
    )
    return metrics

MODEL_METRICS = _load_metrics()


# ── Weather ───────────────────────────────────────────
def get_weather(lat: float, lon: float) -> dict:
    """Fetches real weather from Open-Meteo (no API key needed)."""
    url    = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude":      lat,
        "longitude":     lon,
        "current":       "temperature_2m,wind_speed_10m,relative_humidity_2m",
        "daily":         "precipitation_sum",
        "past_days":     7,
        "forecast_days": 1,
        "timezone":      "Asia/Karachi"
    }
    try:
        response      = requests.get(url, params=params, timeout=10)
        data          = response.json()
        temperature   = data["current"]["temperature_2m"]
        wind_speed    = data["current"]["wind_speed_10m"]
        humidity      = data["current"]["relative_humidity_2m"]
        rainfall_7day = sum(data["daily"]["precipitation_sum"])

        logger.info(
            f"Weather fetched | Temp:{temperature}°C "
            f"Wind:{wind_speed}km/h Humidity:{humidity}% "
            f"Rain7d:{rainfall_7day}mm"
        )
        return {
            "temperature":   temperature,
            "wind_speed":    wind_speed,
            "humidity":      humidity,
            "rainfall_7day": rainfall_7day,
            "source":        "live"
        }
    except Exception:
        logger.warning("Weather API failed — using fallback values")
        return {
            "temperature":   38.0,
            "wind_speed":    20.0,
            "humidity":      20.0,
            "rainfall_7day": 5.0,
            "source":        "fallback"
        }


# ── 72hr Prediction ───────────────────────────────────
def predict_72hr(weather: dict, cluster_size: int) -> dict:
    """Uses the trained Random Forest to predict 72hr outbreak probability."""
    features = np.array([[
        weather["temperature"],
        weather["wind_speed"],
        weather["humidity"],
        weather["rainfall_7day"],
        min(cluster_size * 0.1, 0.8)   # vegetation_index approximation
    ]])

    probability = model.predict_proba(features)[0][1]
    prediction  = model.predict(features)[0]

    if probability >= 0.80:
        risk_72hr = "Critical"
    elif probability >= 0.60:
        risk_72hr = "High"
    elif probability >= 0.40:
        risk_72hr = "Medium"
    else:
        risk_72hr = "Low"

    return {
        "outbreak_predicted": bool(prediction),
        "probability":        round(float(probability), 4),
        "risk_72hr":          risk_72hr
    }


# ── Full Pipeline ─────────────────────────────────────
def run_full_pipeline(
    zone_id:     str,
    sightings:   list,
    eps:         float = 0.5,
    min_samples: int   = 2
) -> dict:
    """
    Full AI pipeline:
      1. DBSCAN  → detect current swarm clusters
      2. Weather → fetch real weather for zone center
      3. RF      → predict 72hr movement risk
    """
    logger.info(f"Pipeline started | Zone: {zone_id}")

    # ── Step 1: DBSCAN ────────────────────────────────
    logger.info("Step 1: Running DBSCAN...")
    dbscan_result = run_dbscan(sightings, eps=eps, min_samples=min_samples)

    # ── Step 2: Weather ───────────────────────────────
    logger.info("Step 2: Fetching weather...")

    # Normalise sighting key names — accept both "lat" and "latitude"
    def _lat(s): return s.get("latitude") or s.get("lat")
    def _lon(s): return s.get("longitude") or s.get("lon")

    if sightings:
        avg_lat = np.mean([float(_lat(s)) for s in sightings])
        avg_lon = np.mean([float(_lon(s)) for s in sightings])
    else:
        avg_lat, avg_lon = 30.0, 67.0   # Pakistan centre fallback

    weather = get_weather(avg_lat, avg_lon)

    # ── Step 3: RF 72hr prediction ────────────────────
    logger.info("Step 3: Running 72hr prediction...")
    largest_cluster = max(
        [c["size"] for c in dbscan_result["clusters"]],
        default=0
    )
    prediction = predict_72hr(weather, largest_cluster)

    logger.info(
        f"Pipeline complete | "
        f"Current: {dbscan_result['risk_level']} | "
        f"72hr: {prediction['risk_72hr']} | "
        f"Prob: {prediction['probability'] * 100:.1f}%"
    )

    return {
        "zone_id":      zone_id,

        # DBSCAN
        "current_swarm":    dbscan_result["swarm_found"],
        "current_risk":     dbscan_result["risk_level"],
        "current_score":    dbscan_result["risk_score"],
        "clusters":         dbscan_result["clusters"],
        "noise_count":      dbscan_result["noise_count"],

        # Weather
        "weather":          weather,

        # RF 72hr
        "outbreak_72hr":    prediction["outbreak_predicted"],
        "risk_72hr":        prediction["risk_72hr"],
        "probability_72hr": prediction["probability"],

        # ✅ FIX: real model metrics, not a hardcoded number
        "model_metrics":    MODEL_METRICS,
    }
