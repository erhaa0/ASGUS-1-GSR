import joblib
import numpy as np
import requests
from pathlib import Path
from dbscan_engine import run_dbscan

# ── Load trained model once when file is imported ────
MODEL_PATH = Path(__file__).resolve().parent / "model.pkl"
model = joblib.load(MODEL_PATH)
print("[OK] Random Forest model loaded")

# ─────────────────────────────────────────────────────
def get_weather(lat: float, lon: float) -> dict:
    """
    Fetches real weather data from Open-Meteo API.
    Free — no API key needed.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
    "latitude":      lat,
    "longitude":     lon,
    "current":       "temperature_2m,wind_speed_10m,relative_humidity_2m",
    "daily":         "precipitation_sum",
    "past_days":     7,
    "forecast_days": 1,
    "timezone":      "Asia/Karachi"   # ← already there, but add this too
}

    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        temperature = data["current"]["temperature_2m"]
        wind_speed  = data["current"]["wind_speed_10m"]
        humidity    = data["current"]["relative_humidity_2m"]
        
        print(f"Weather time: {data['current']['time']}")
        # Sum of last 7 days rainfall
        rainfall_7day = sum(data["daily"]["precipitation_sum"])

        print(f"[OK] Weather fetched | Temp:{temperature} C "
              f"Wind:{wind_speed}km/h "
              f"Humidity:{humidity}% "
              f"Rain7d:{rainfall_7day}mm")

        return {
            "temperature":   temperature,
            "wind_speed":    wind_speed,
            "humidity":      humidity,
            "rainfall_7day": rainfall_7day,
            "source":        "live"
        }

    except Exception as e:
        print(f"[WARN] Weather API failed: {e} - using fallback values")
        return {
            "temperature":   38.0,
            "wind_speed":    20.0,
            "humidity":      20.0,
            "rainfall_7day": 5.0,
            "source":        "fallback"
        }

# ─────────────────────────────────────────────────────
def predict_72hr(weather: dict, cluster_size: int) -> dict:
    """
    Uses Random Forest to predict 72hr outbreak probability.
    """
    features = np.array([[
        weather["temperature"],
        weather["wind_speed"],
        weather["humidity"],
        weather["rainfall_7day"],
        min(cluster_size * 0.1, 0.8)   # vegetation_index approximation
    ]])

    probability  = model.predict_proba(features)[0][1]  # outbreak probability
    prediction   = model.predict(features)[0]            # 0 or 1

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

# ─────────────────────────────────────────────────────
def run_full_pipeline(zone_id: str, sightings: list,
                      eps: float = 0.5,
                      min_samples: int = 2) -> dict:
    """
    Full AI pipeline:
      1. DBSCAN  → detect current swarm clusters
      2. Weather → fetch real weather for zone center
      3. RF      → predict 72hr movement risk

    zone_id   : zone identifier string
    sightings : list of {"lat": float, "lon": float}
    """

    print("\n" + "=" * 50)
    print(f"LC-EWS FULL PIPELINE - Zone: {zone_id}")
    print("=" * 50)

    # ── Step 1: DBSCAN ────────────────────────────────
    print("\nSTEP 1: Running DBSCAN...")
    dbscan_result = run_dbscan(sightings, eps=eps,
                               min_samples=min_samples)

    # ── Step 2: Weather ───────────────────────────────
    print("\nSTEP 2: Fetching weather...")

    # Use center of all sightings for weather lookup
    if sightings:
        avg_lat = np.mean([s["lat"] for s in sightings])
        avg_lon = np.mean([s["lon"] for s in sightings])
    else:
        avg_lat, avg_lon = 30.0, 67.0   # Default Pakistan center

    weather = get_weather(avg_lat, avg_lon)

    # ── Step 3: Random Forest 72hr Prediction ─────────
    print("\nSTEP 3: Running 72hr prediction...")
    largest_cluster = max(
        [c["size"] for c in dbscan_result["clusters"]],
        default=0
    )
    prediction = predict_72hr(weather, largest_cluster)

    # ── Final Result ──────────────────────────────────
    result = {
        "zone_id":          zone_id,

        # DBSCAN results
        "current_swarm":    dbscan_result["swarm_found"],
        "current_risk":     dbscan_result["risk_level"],
        "current_score":    dbscan_result["risk_score"],
        "clusters":         dbscan_result["clusters"],
        "noise_count":      dbscan_result["noise_count"],

        # Weather
        "weather":          weather,

        # RF 72hr prediction
        "outbreak_72hr":    prediction["outbreak_predicted"],
        "risk_72hr":        prediction["risk_72hr"],
        "probability_72hr": prediction["probability"],
    }

    print("\n" + "=" * 50)
    print("PIPELINE COMPLETE")
    print(f"  Current Risk  : {result['current_risk']}")
    print(f"  72hr Risk     : {result['risk_72hr']}")
    print(f"  Probability   : {result['probability_72hr'] * 100:.1f}%")
    print(f"  Swarm Found   : {result['current_swarm']}")
    print("=" * 50)

    return result
