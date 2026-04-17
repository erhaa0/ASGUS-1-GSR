from predict import run_full_pipeline

# Simulate a detection job for Zone 1 (Balochistan)
sightings = [
    {"lat": 30.18, "lon": 66.97},
    {"lat": 30.21, "lon": 67.01},
    {"lat": 30.19, "lon": 66.95},
    {"lat": 30.22, "lon": 67.03},
    {"lat": 30.20, "lon": 66.99},
    {"lat": 34.01, "lon": 71.57},
    {"lat": 34.03, "lon": 71.59},
    {"lat": 29.00, "lon": 70.00},  # noise
]

result = run_full_pipeline(
    zone_id   = "zone_balochistan_01",
    sightings = sightings
)

print("\nFINAL JSON RESULT:")
import json
print(json.dumps(result, indent=2))
