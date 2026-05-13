from dbscan_engine import run_dbscan

# Simulate locust sightings in two areas of Pakistan
test_sightings = [
    # Cluster 1 — Quetta area (should be HIGH/CRITICAL)
    {"lat": 30.18, "lon": 66.97},
    {"lat": 30.21, "lon": 67.01},
    {"lat": 30.19, "lon": 66.95},
    {"lat": 30.22, "lon": 67.03},
    {"lat": 30.20, "lon": 66.99},
    {"lat": 30.23, "lon": 67.05},

    # Cluster 2 — Peshawar area (should be MEDIUM)
    {"lat": 34.01, "lon": 71.57},
    {"lat": 34.03, "lon": 71.59},

    # Noise — isolated sighting (should be ignored)
    {"lat": 29.00, "lon": 70.00},
]

result = run_dbscan(test_sightings)

print("\nFINAL RESULT:")
print(f"Swarm Found  : {result['swarm_found']}")
print(f"Risk Level   : {result['risk_level']}")
print(f"Clusters     : {len(result['clusters'])}")
print(f"Noise Points : {result['noise_count']}")