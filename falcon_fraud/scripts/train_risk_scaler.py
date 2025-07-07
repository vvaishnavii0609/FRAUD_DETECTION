# scripts/train_risk_scaler.py

import joblib
import pandas as pd
import yaml
import os
from sklearn.preprocessing import MinMaxScaler

# 🔧 Load config
with open("backend_flask/config/features_config.yaml", "r") as f:
    config = yaml.safe_load(f)

# Load the features
df = pd.read_csv("transactionsnew2.csv")
df.fillna(0, inplace=True)

# Preprocess
label_encoders = joblib.load(config["model_paths"]["encoders"])
for col in config["features"]["categorical"]:
    le = label_encoders[col]
    df[col + config["encoding_suffix"]] = le.transform(df[col])

feature_cols = (
    config["features"]["numerical"] +
    [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
)
X = df[feature_cols]

# Load ISO model and scaler
iso_model = joblib.load(config["model_paths"]["iso"])
iso_scaler = joblib.load(config["model_paths"]["iso_scaler"])
X_iso_scaled = iso_scaler.transform(X)

# Get raw anomaly scores
anomaly_scores = iso_model.decision_function(X_iso_scaled)
reshaped = anomaly_scores.reshape(-1, 1)

# Fit MinMaxScaler
risk_scaler = MinMaxScaler(feature_range=(0, 100))
risk_scaler.fit(reshaped)

# Save it
output_path = os.path.join("backend-flask", "models", "iso_risk_scaler.pkl")
joblib.dump(risk_scaler, output_path)

print("✅ Risk scaler trained and saved to", output_path)
