import pandas as pd
import numpy as np
import joblib
import yaml
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import os

# Load config
with open("backend_flask/config/features_config.yaml", "r") as f:
    config = yaml.safe_load(f)

# Load data
df = pd.read_csv("transactionsnew2.csv")
df.fillna(0, inplace=True)

# Subsample (optional)
df_fraud = df[df['is_fraud'] == 1].sample(n=1000, random_state=42)
df_legit = df[df['is_fraud'] == 0].sample(n=29000, random_state=42)
df = pd.concat([df_fraud, df_legit]).sample(frac=1, random_state=42).reset_index(drop=True)

# Encode categorical
label_encoders = {}
for col in config["features"]["categorical"]:
    le = LabelEncoder()
    df[col] = df[col].astype(str)


    unique_values = df[col].unique().tolist()
    if "Unknown" not in unique_values:
        unique_values.append("Unknown")

    le.fit(unique_values)
    df[col + config["encoding_suffix"]] = le.transform(df[col])
    label_encoders[col] = le
# Feature selection
feature_cols = (
    config["features"]["numerical"] +
    [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
)
X = df[feature_cols]
y = df["is_fraud"]

# Scale
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train model
model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
model.fit(X_scaled)

joblib.dump(scaler, config["model_paths"]["iso_scaler"])

# Get raw anomaly scores from model
raw_scores = -model.decision_function(X_scaled).reshape(-1, 1)  # Take negative because lower means more anomalous

# Fit a MinMaxScaler on these scores to scale to 0-100
from sklearn.preprocessing import MinMaxScaler
risk_scaler = MinMaxScaler((0, 100))
risk_scaler.fit(raw_scores)

# Save the scaler for later use in Flask
joblib.dump(risk_scaler, config["model_paths"]["iso_risk_scaler"])


# Predict
y_pred = model.predict(X_scaled)
y_pred = np.where(y_pred == -1, 1, 0)

print("Accuracy:", accuracy_score(y, y_pred))
print("Classification Report:\n", classification_report(y, y_pred))

# Save
os.makedirs("backend-flask/models", exist_ok=True)
joblib.dump(model, config["model_paths"]["iso"])
joblib.dump(scaler, config["model_paths"]["iso_scaler"])
joblib.dump(label_encoders, config["model_paths"]["encoders"])  # Can reuse same encoders
print("✅ Isolation Forest Model + Scaler saved.")
