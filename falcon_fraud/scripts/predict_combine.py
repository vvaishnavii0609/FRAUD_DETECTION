import pandas as pd
import joblib
import numpy as np
import yaml
from sklearn.preprocessing import MinMaxScaler
import yaml

# 🔧 Load config
with open("backend_flask/config/features_config.yaml", "r") as f:
    config = yaml.safe_load(f)

# 📄 Load raw transaction data
df = pd.read_csv("transactionsnew2.csv")
df.fillna(0, inplace=True)

# 🔁 Encode categorical features
label_encoders = joblib.load(config["model_paths"]["encoders"])
for col in config["features"]["categorical"]:
    le = label_encoders[col]
    df[col + config["encoding_suffix"]] = le.transform(df[col])

# ✅ Select features
feature_cols = (
    config["features"]["numerical"] +
    [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
)
X = df[feature_cols]

# 📦 Load models and scalers
rf_model = joblib.load(config["model_paths"]["rf"])
iso_model = joblib.load(config["model_paths"]["iso"])
rf_scaler = joblib.load(config["model_paths"]["rf_scaler"])
iso_scaler = joblib.load(config["model_paths"]["iso_scaler"])

# 📊 Scale
X_rf_scaled = rf_scaler.transform(X)
X_iso_scaled = iso_scaler.transform(X)

# 🔮 Predict
df["rf_pred"] = rf_model.predict(X_rf_scaled)
anomaly_scores = iso_model.decision_function(X_iso_scaled)
reshaped_scores = -anomaly_scores.reshape(-1, 1)
risk_scaler = joblib.load(config["model_paths"]["iso_risk_scaler"])
df["risk_score"] = risk_scaler.transform(reshaped_scores).flatten()


print("⚠️ Sample anomaly scores (ISO):", anomaly_scores[:5])
print("📈 Inverted scores:", reshaped_scores[:5])
print("🔥 Final risk scores:", df["risk_score"].head().tolist())




# 🎯 Assign risk level
def assign_risk(score, config):
    if score < config["decision_logic"]["review_threshold"]:
        return "✅ Low Risk"
    elif score < config["decision_logic"]["block_threshold"]:
        return "⚠️ Medium Risk"
    else:
        return "❌ High Risk"

df["risk_level"] = df["risk_score"].apply(lambda score: assign_risk(score, config))


# 🧠 Final decision logic
def final_decision(rf_pred, risk_level, amount):
    if risk_level == "❌ High Risk":
        return "🚫 Block & Review"
    if rf_pred == 1 and amount > 100000:
        return "🚫 Block & Review"
    if rf_pred == 1:
        return "🔍 Send to Admin"
    return "✅ Auto-approved"


df["final_decision"] = df.apply(lambda row: final_decision(row["rf_pred"], row["risk_level"], row["amount"]), axis=1)

# 📁 Filter transactions for manual review
admin_df = df[df["final_decision"] == "🔍 Send to Admin"].copy()
admin_df["human_verdict"] = "🕒 Pending"

# 💾 Save to feedback folder
admin_df.to_csv("feedback/admin_review_transactions.csv", index=False)
print("✅ Exported flagged transactions for admin review.")

print(df["final_decision"].value_counts())
