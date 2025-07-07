import pandas as pd
import joblib
import yaml
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import os
from sklearn.preprocessing import MinMaxScaler

# Load config
with open("backend_flask/config/features_config.yaml", "r") as f:
    config = yaml.safe_load(f)

# Load base + feedback data
base = pd.read_csv("transactionsnew2.csv")
feedback = pd.read_csv("feedback/admin_review_transactions.csv")

# Only take those with human verdict
feedback = feedback[feedback["human_verdict"].isin(["✅ Not Fraud", "❌ Fraud"])]

# Map human verdict to is_fraud
feedback["is_fraud"] = feedback["human_verdict"].map({"✅ Not Fraud": 0, "❌ Fraud": 1})

# Combine
df = pd.concat([base, feedback], ignore_index=True)

# Encode
label_encoders = {}
for col in config["features"]["categorical"]:
    le = LabelEncoder()
    df[col] = df[col].astype(str)
    unique_vals = df[col].unique().tolist()
    if "Unknown" not in unique_vals:
        unique_vals.append("Unknown")
    le.fit(unique_vals)
    df[col + config["encoding_suffix"]] = le.transform(df[col])
    label_encoders[col] = le


# Feature selection
feature_cols = (
    config["features"]["numerical"] +
    [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
)
df_fraud = df[df["is_fraud"] == 1]
df_legit_pool = df[df["is_fraud"] == 0]

desired_legit = min(len(df_legit_pool), len(df_fraud) * 10)
df_legit = df_legit_pool.sample(n=desired_legit, random_state=42)

df_rf = pd.concat([df_fraud, df_legit]).sample(frac=1, random_state=42)

X = df_rf[feature_cols]
y = df_rf["is_fraud"]


# --- Random Forest Retrain ---
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

rf_scaler = StandardScaler()
X_train_scaled = rf_scaler.fit_transform(X_train)
X_test_scaled = rf_scaler.transform(X_test)

rf_model = RandomForestClassifier(n_estimators=100, max_depth=10, min_samples_split=10,
                                  min_samples_leaf=4, max_features=4, random_state=42)
rf_model.fit(X_train_scaled, y_train)

# Save RF model
joblib.dump(rf_model, config["model_paths"]["rf"])
joblib.dump(rf_scaler, config["model_paths"]["rf_scaler"])
joblib.dump(label_encoders, config["model_paths"]["encoders"])
print("✅ Random Forest retrained and saved.")

# --- Isolation Forest Retrain ---
df_fraud = df[df["is_fraud"] == 1].sample(n=min(1000, len(df[df["is_fraud"] == 1])), random_state=42)
df_legit = df[df["is_fraud"] == 0].sample(n=min(29000, len(df[df["is_fraud"] == 0])), random_state=42)
df_iso = pd.concat([df_fraud, df_legit]).sample(frac=1, random_state=42)

X_iso = df_iso[feature_cols]

iso_scaler = StandardScaler()
X_iso_scaled = iso_scaler.fit_transform(X_iso)

iso_model = IsolationForest(n_estimators=100, contamination=0.01, random_state=42)
iso_model.fit(X_iso_scaled)

# Save ISO model + scaler
joblib.dump(iso_model, config["model_paths"]["iso"])
joblib.dump(iso_scaler, config["model_paths"]["iso_scaler"])

# Risk score scaling
raw_scores = -iso_model.decision_function(X_iso_scaled).reshape(-1, 1)
risk_scaler = MinMaxScaler((0, 100))
risk_scaler.fit(raw_scores)
joblib.dump(risk_scaler, config["model_paths"]["iso_risk_scaler"])

print("✅ Isolation Forest retrained and saved.")
