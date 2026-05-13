import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)
import joblib
import json
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
    X, y, test_size=0.2, random_state=42
)
print(f"\n✅ Training samples : {len(X_train)}")
print(f"✅ Testing  samples : {len(X_test)}")

# ── 4. Train Model ───────────────────────────────────
print("\n⏳ Training Random Forest...")
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42
)
model.fit(X_train, y_train)
print("✅ Training complete!")

# ── 5. Evaluate ──────────────────────────────────────
y_pred = model.predict(X_test)

# ✅ FIX: compute every metric from the real test set
accuracy  = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall    = recall_score(y_test, y_pred, zero_division=0)
f1        = f1_score(y_test, y_pred, zero_division=0)

print("\n" + "=" * 50)
print("MODEL EVALUATION")
print("=" * 50)
print(f"Accuracy  : {accuracy  * 100:.2f}%")
print(f"Precision : {precision * 100:.2f}%")
print(f"Recall    : {recall    * 100:.2f}%")
print(f"F1 Score  : {f1        * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred,
      target_names=["No Outbreak", "Outbreak"]))

# ── 6. Feature Importance ────────────────────────────
print("Feature Importance:")
for feat, imp in sorted(
    zip(X.columns, model.feature_importances_),
    key=lambda x: x[1], reverse=True
):
    bar = "█" * int(imp * 40)
    print(f"  {feat:<20} {bar} {imp:.4f}")

# ── 7. Save Model ────────────────────────────────────
os.makedirs("ai", exist_ok=True)
joblib.dump(model, "ai/model.pkl")
print("\n✅ Model saved → ai/model.pkl")

# ✅ FIX: save real metrics to JSON so predict.py can read them
# Every time you retrain, this file is automatically updated
metrics = {
    "accuracy":         round(float(accuracy),  4),
    "precision":        round(float(precision), 4),
    "recall":           round(float(recall),    4),
    "f1_score":         round(float(f1),        4),
    "test_sample_size": int(len(y_test)),
    "train_sample_size":int(len(X_train)),
    "note": "Metrics computed on the held-out 20% test split at training time."
}
with open("ai/model_metrics.json", "w") as f:
    json.dump(metrics, f, indent=2)

print("✅ Metrics saved → ai/model_metrics.json")
print(f"   Accuracy  : {accuracy  * 100:.2f}%")
print(f"   Precision : {precision * 100:.2f}%")
print(f"   Recall    : {recall    * 100:.2f}%")
print(f"   F1 Score  : {f1        * 100:.2f}%")
print("=" * 50)
