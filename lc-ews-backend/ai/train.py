import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

print("=" * 50)
print("LC-EWS — Training Random Forest Model")
print("=" * 50)

# ── 1. Load Dataset ──────────────────────────────────
df = pd.read_csv("data/locust_data.csv")
print(f"\n✅ Dataset loaded: {len(df)} rows")

# ── 2. Features & Target ─────────────────────────────
X = df[[
    "temperature",
    "wind_speed",
    "humidity",
    "rainfall_7day",
    "vegetation_index"
]]

y = df["outbreak"]

print(f"✅ Features: {list(X.columns)}")
print(f"✅ Outbreak cases: {y.sum()} / {len(y)}")

# ── 3. Train / Test Split ────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,      # 80% train, 20% test
    random_state=42
)

print(f"\n✅ Training samples : {len(X_train)}")
print(f"✅ Testing  samples : {len(X_test)}")

# ── 4. Train Model ───────────────────────────────────
print("\n⏳ Training Random Forest...")

model = RandomForestClassifier(
    n_estimators=100,    # 100 decision trees
    max_depth=10,        # max depth per tree
    random_state=42
)

model.fit(X_train, y_train)
print("✅ Training complete!")

# ── 5. Evaluate ──────────────────────────────────────
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print("\n" + "=" * 50)
print("MODEL EVALUATION")
print("=" * 50)
print(f"Accuracy : {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred,
      target_names=["No Outbreak", "Outbreak"]))

# ── 6. Feature Importance ────────────────────────────
print("Feature Importance:")
for feat, imp in sorted(
    zip(X.columns, model.feature_importances_),
    key=lambda x: x[1],
    reverse=True
):
    bar = "█" * int(imp * 40)
    print(f"  {feat:<20} {bar} {imp:.4f}")

# ── 7. Save Model ────────────────────────────────────
os.makedirs("ai", exist_ok=True)
joblib.dump(model, "ai/model.pkl")

print("\n" + "=" * 50)
print("✅ Model saved to ai/model.pkl")
print("=" * 50)