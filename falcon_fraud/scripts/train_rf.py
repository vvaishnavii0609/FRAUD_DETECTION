import pandas as pd
import numpy as np
import joblib
import yaml
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import os

# Load config
with open("backend_flask/config/features_config.yaml", "r") as f:
    config = yaml.safe_load(f)

# Load data
df = pd.read_csv("transactionsnew2.csv")
df_fraud = df[df['is_fraud'] == 1]
df_legit_pool = df[df['is_fraud'] == 0]

desired_legit = min(len(df_legit_pool), len(df_fraud) * 10)
df_legit = df_legit_pool.sample(n=desired_legit, random_state=42)

df = pd.concat([df_fraud, df_legit]).sample(frac=1, random_state=42)


df.fillna(0, inplace=True)

# Encode categorical
label_encoders = {}
for col in config["features"]["categorical"]:
    le = LabelEncoder()
    df[col] = df[col].astype(str)

    # Ensure 'Unknown' is part of classes
    unique_values = df[col].unique().tolist()
    if "Unknown" not in unique_values:
        unique_values.append("Unknown")

    le.fit(unique_values)
    df[col + config["encoding_suffix"]] = le.transform(df[col])
    label_encoders[col] = le


# Select features
feature_cols = (
    config["features"]["numerical"] +
    [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
)
X = df[feature_cols]
y = df["is_fraud"]

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train model
model = RandomForestClassifier(
    n_estimators=100, max_depth=10, min_samples_split=10,
    min_samples_leaf=4, max_features=4, random_state=42
)
model.fit(X_train_scaled, y_train)

# Evaluate
cv_score = cross_val_score(model, X_train_scaled, y_train, cv=5).mean()
print(f"Cross-Validation Accuracy: {cv_score:.4f}")
print(f"Train Accuracy: {accuracy_score(y_train, model.predict(X_train_scaled)):.4f}")
print(f"Test Accuracy: {accuracy_score(y_test, model.predict(X_test_scaled)):.4f}")
print("Classification Report:\n", classification_report(y_test, model.predict(X_test_scaled)))

# Save
joblib.dump(model, config["model_paths"]["rf"])
joblib.dump(scaler, config["model_paths"]["rf_scaler"])
joblib.dump(label_encoders, config["model_paths"]["encoders"])
print("✅ RF Model, Scaler, Encoders saved.")
