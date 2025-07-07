import pandas as pd
import numpy as np
import joblib
import yaml
import matplotlib.pyplot as plt
from sklearn.metrics import ConfusionMatrixDisplay, classification_report, accuracy_score
from sklearn.preprocessing import MinMaxScaler

# 📁 Load Config
with open("config/features_config.yaml", "r") as f:
    config = yaml.safe_load(f)

# 📦 Load Models + Scalers + Encoders
rf_model = joblib.load(config["rf_fraud_model"])
iso_model = joblib.load(config["iso_forest_model"])
rf_scaler = joblib.load(config["scalers"]["rf_scaler"])
iso_scaler = joblib.load(config["scalers"]["iso_scaler"])
label_encoders = joblib.load(config["encoders_path"])
iso_risk_scaler = joblib.load("models/iso_risk_scaler.pkl")

# 📄 Load Dataset
df = pd.read_csv("transactionsnew2.csv")
df.fillna(0, inplace=True)

# 🔁 Encode Categorical Columns
for col in config["features"]["categorical"]:
    le = label_encoders[col]
    df[col] = df[col].astype(str)
    df[col + config["encoding_suffix"]] = le.transform(
        df[col].apply(lambda x: x if x in le.classes_ else "Unknown")
    )

# 🎯 Feature Columns
feature_cols = (
    config["features"]["numerical"] +
    [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
)
X = df[feature_cols]
y = df["is_fraud"]

# 🔢 Scale Features
X_rf_scaled = rf_scaler.transform(X)
X_iso_scaled = iso_scaler.transform(X)

# ✅ RF Evaluation
rf_preds = rf_model.predict(X_rf_scaled)
print("\n🎯 RANDOM FOREST METRICS")
print("Accuracy:", accuracy_score(y, rf_preds))
print("Classification Report:\n", classification_report(y, rf_preds))

ConfusionMatrixDisplay.from_estimator(rf_model, X_rf_scaled, y, display_labels=["Legit", "Fraud"])
plt.title("RF: Confusion Matrix")
plt.show()

# 📈 Feature Importance
importances = rf_model.feature_importances_
sorted_idx = np.argsort(importances)[::-1]

plt.figure(figsize=(10, 5))
plt.bar(range(len(importances)), importances[sorted_idx], color='purple')
plt.xticks(range(len(importances)), [feature_cols[i] for i in sorted_idx], rotation=90)
plt.title("RF: Feature Importance")
plt.tight_layout()
plt.show()

# 🧠 ISO Evaluation
print("\n🚨 ISOLATION FOREST EVALUATION")

anomaly_scores = -iso_model.decision_function(X_iso_scaled)
risk_scores = iso_risk_scaler.transform(anomaly_scores.reshape(-1, 1)).flatten()
iso_preds = np.where(anomaly_scores > np.percentile(anomaly_scores, 97), 1, 0)

print("Accuracy (ISO vs. labels):", accuracy_score(y, iso_preds))
print("Classification Report:\n", classification_report(y, iso_preds))

# 📊 Anomaly Score Histogram
plt.hist(anomaly_scores[y == 0], bins=50, alpha=0.7, label="Legit", color="green")
plt.hist(anomaly_scores[y == 1], bins=50, alpha=0.7, label="Fraud", color="red")
plt.title("ISO: Anomaly Score Distribution")
plt.xlabel("Anomaly Score")
plt.ylabel("Frequency")
plt.legend()
plt.tight_layout()
plt.show()
