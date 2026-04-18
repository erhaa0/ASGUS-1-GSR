import pandas as pd
import numpy as np

np.random.seed(42)
n = 1000

# Pakistan regions with real coordinates
regions = {
    "Balochistan": {"lat": (26.0, 32.0), "lon": (61.0, 69.0)},
    "KPK":         {"lat": (31.0, 36.0), "lon": (69.0, 74.0)},
    "Sindh":       {"lat": (23.0, 28.0), "lon": (66.0, 71.0)},
    "Punjab":      {"lat": (28.0, 34.0), "lon": (70.0, 75.0)},
}

rows = []

for i in range(n):
    # Pick a random region
    region_name = np.random.choice(list(regions.keys()))
    region = regions[region_name]

    lat = np.random.uniform(*region["lat"])
    lon = np.random.uniform(*region["lon"])

    # Weather features
    temperature     = np.random.uniform(25, 47)
    wind_speed      = np.random.uniform(5, 40)
    humidity        = np.random.uniform(8, 45)
    rainfall_7day   = np.random.uniform(0, 25)
    vegetation_index = np.random.uniform(0.1, 0.8)

    # Realistic outbreak rule:
    # Hot + windy + dry = locusts likely
    outbreak = int(
        (temperature > 35) and
        (wind_speed > 18) and
        (humidity < 25) and
        (rainfall_7day < 10)
    )

    # Add some random noise (real data is never perfect)
    if np.random.rand() < 0.05:
        outbreak = 1 - outbreak

    rows.append({
        "region":           region_name,
        "latitude":         round(lat, 4),
        "longitude":        round(lon, 4),
        "temperature":      round(temperature, 2),
        "wind_speed":       round(wind_speed, 2),
        "humidity":         round(humidity, 2),
        "rainfall_7day":    round(rainfall_7day, 2),
        "vegetation_index": round(vegetation_index, 3),
        "outbreak":         outbreak
    })

df = pd.DataFrame(rows)

# Save to CSV
df.to_csv("data/locust_data.csv", index=False)

# Print summary
print("Dataset generated successfully!")
print(f"Total rows: {len(df)}")
print(f"Outbreaks (1): {df['outbreak'].sum()}")
print(f"No outbreak (0): {(df['outbreak'] == 0).sum()}")
print("\nSample rows:")
print(df.head())