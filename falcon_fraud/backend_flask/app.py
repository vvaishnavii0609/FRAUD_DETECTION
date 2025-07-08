from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
import yaml
from datetime import datetime
from utils.feature_engineering import get_timestamp, get_hour, get_geo_distance, is_new_beneficiary
import os
import traceback
import requests
from decision_logic import assign_risk

app = Flask(__name__)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# 🔧 Load the config YAML
config_path = os.path.join(os.path.dirname(__file__), "config", "features_config.yaml")
with open(config_path) as f:
    config = yaml.safe_load(f)

# ✅ Load models + scalers
model_paths = config["model_paths"]
model_paths = {k: os.path.join(ROOT_DIR, v) for k, v in model_paths.items()}
rf_model = joblib.load(model_paths["rf"])
iso_model = joblib.load(model_paths["iso"])
rf_scaler = joblib.load(model_paths["rf_scaler"])
iso_scaler = joblib.load(model_paths["iso_scaler"])
label_encoders = joblib.load(model_paths["encoders"])
iso_risk_scaler = joblib.load(model_paths["iso_risk_scaler"])

# ✅ Load merchant metadata
merchant_df = pd.read_csv("merchant_metadata_enriched.csv")

# ✅ Load previous txn log for is_new_beneficiary logic
txn_log_path = "database/txn_log.csv"
global txn_df
txn_df = pd.read_csv(txn_log_path) if os.path.exists(txn_log_path) else pd.DataFrame(columns=["sender_account", "beneficiary_account", "timestamp"])

# 🔁 Risk score mapping
def assign_risk(score,config):
    if score < config["decision_logic"]["review_threshold"]:
        return "✅ Low Risk"
    elif score < config["decision_logic"]["block_threshold"]:
        return "⚠️ Medium Risk"
    else:
        return "❌ High Risk"

# 🧠 Final Decision Logic
def final_decision(rf_pred, risk_level, geo_anomaly=False, rapid_repeat=False, amount=0, risk_score=0.0):
    # 🔸 Special case: small amount but flagged as high risk
    if risk_level == "❌ High Risk" and amount < 200 and risk_score < 80:
        return "🔍 Send to Admin"

    # ✅ Safe auto-approve: low risk & low amount
    if rf_pred == 0 and risk_level != "❌ High Risk" and amount < 1000:
        return "✅ Auto-approved"

    # 🚫 Block outright if high risk
    if risk_level == "❌ High Risk" and amount>=200:
        return "🚫 Block & Review"

    # 🚫 Escalate if predicted fraud + serious factors
    if rf_pred == 1:
        if geo_anomaly or rapid_repeat or amount > 100000:
            return "🚫 Block & Review"
        return "🔍 Send to Admin"

    # 🔍 Legit but suspicious
    if geo_anomaly and amount > 100000:
        return "🔍 Send to Admin"

    return "✅ Auto-approved"






# 🧠 Lookup merchant_category and device_type
def infer_metadata(beneficiary_account):
    row = merchant_df[merchant_df["beneficiary_account"] == beneficiary_account]
    if not row.empty:
        return (
            row.iloc[0]["merchant_category"],
            row.iloc[0]["device_type"],
            float(row.iloc[0]["merchant_lat"]),
            float(row.iloc[0]["merchant_lon"])
        )
    # Default fallback if not found
    return "P2P", "Mobile", 19.076, 72.8777


from datetime import datetime, timedelta

def is_rapid_repeat(sender, beneficiary, df, threshold=3, minutes=60):
    now = datetime.now()
    df = df.copy()
    if df.empty:
        return False
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    recent = df[
        (df["sender_account"] == sender) &
        (df["beneficiary_account"] == beneficiary) &
        (df["timestamp"] >= now - timedelta(minutes=minutes))
    ]
    return len(recent) >= threshold



# def get_beneficiary_coords_from_ifsc(ifsc):
#     try:
#         response = requests.get(f"https://ifsc.razorpay.com/{ifsc}", timeout=5)
#         if response.status_code == 200:
#             data = response.json()
#             # These fields may not be present – Razorpay API does not return lat/lon directly
#             lat = data.get("LATITUDE", None)
#             lon = data.get("LONGITUDE", None)

#             if lat and lon:
#                 return float(lat), float(lon)
#             else:
#                 print("⚠️ No lat/lon in API response. Falling back.")
#                 return 0.0, 0.0
#         else:
#             print(f"❌ IFSC API returned status {response.status_code}")
#             return 0.0, 0.0
#     except Exception as e:
#         print(f"❌ Error in IFSC API: {e}")
#         return 0.0, 0.0

def get_beneficiary_coords_from_ifsc(ifsc):
    # TEMP PATCH: Return fixed Mumbai coords to avoid zeros during testing
    return 19.076, 72.8777

    
def get_time_since_last_txn(sender, txn_df, current_time):
    user_txns = txn_df[txn_df["sender_account"] == sender]

    if user_txns.empty:
        return 0.0

    user_txns["timestamp"] = pd.to_datetime(user_txns["timestamp"])
    last_time = user_txns["timestamp"].max()

    delta = (current_time - last_time).total_seconds() / 60  # in minutes
    return round(delta, 2)

def get_time_diff_mins(sender, beneficiary, txn_df, current_time):
    df = txn_df[
        (txn_df["sender_account"] == sender) &
        (txn_df["beneficiary_account"] == beneficiary)
    ]
    if df.empty:
        return 0.0
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    last_time = df["timestamp"].max()
    delta = (current_time - last_time).total_seconds() / 60
    return round(delta, 2)


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
                # ✅ RBI Compliance Rules
        print("📥 Incoming JSON:", data)
        if "transaction_type" not in data and "channel" in data:
            data["transaction_type"] = data["channel"]

        def apply_rbi_rules(data):
            txn_type = data.get("transaction_type")
            amount = data.get("amount", 0)

            if txn_type == "RTGS" and amount < 200000:
                data["rbi_violation"] = True
                data["violation_reason"] = "RTGS below ₹2 lakh"
            elif txn_type == "IMPS" and amount > 500000:
                data["rbi_violation"] = True
                data["violation_reason"] = "IMPS above ₹5 lakh"
            elif txn_type == "UPI" and amount > 100000:
                data["rbi_violation"] = True
                data["violation_reason"] = "UPI above ₹1 lakh"
            else:
                data["rbi_violation"] = False
                data["violation_reason"] = ""
            return data

        data = apply_rbi_rules(data)

        # Optional early return if rule violated
        if data["rbi_violation"]:
            return jsonify({
                "rf_prediction": 1,
                "anomaly_score": 0.0,
                "risk_score": 100.0,
                "risk_level": "❌ High Risk",
                "final_decision": "🚫 Block & Review",
                "violation_reason": data["violation_reason"]
            }), 200

        optional_fields = [
            "beneficiary_name",
            "beneficiary_branch",
            "beneficiary_bank_name",
            "sender_name",
            "sender_address"
        ]

        # Add them to data (even if not used in model)
        for field in optional_fields:
            data[field] = data.get(field, "")

        # ✅ Validate required fields from YAML
        required_fields = config["required_user_inputs"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        # ✅ Add timestamp & hour
        timestamp = get_timestamp()
        data["timestamp"] = timestamp.isoformat()
        data["hour"] = get_hour(timestamp)

        # ✅ Derive geo location (assume sender = device)
        for coord in ["sender_lat", "sender_lon"]:
            data[coord] = data.get("device_" + coord.split("_")[1], 0.0)

        # ✅ Dummy values (mock until real DB)


        data["time_diff_mins"] = get_time_diff_mins(
    data["sender_account"], data["beneficiary_account"], txn_df, timestamp)
        data["time_since_last_txn"] = get_time_since_last_txn(
         data["sender_account"], txn_df, timestamp)


        # ✅ Infer metadata
        data["merchant_category"], data["device_type"], data["merchant_lat"], data["merchant_lon"] = infer_metadata(data["beneficiary_account"])


        # ✅ Patch beneficiary and merchant lat/lon
# ✅ Get beneficiary lat/lon from IFSC
# Beneficiary lat/lon can come from metadata or defaults
        data["beneficiary_lat"], data["beneficiary_lon"] = infer_metadata(data["beneficiary_account"])[2], infer_metadata(data["beneficiary_account"])[3]


        coord_m = (data["merchant_lat"], data["merchant_lon"])
        coord_b = (data["beneficiary_lat"], data["beneficiary_lon"])
        data["distance_km"] = get_geo_distance(coord_m, coord_b)

        # ✅ Geo distance
        merchant_coords = (data["merchant_lat"], data["merchant_lon"])
        device_coords = (data["device_lat"], data["device_lon"])
        data["distance_km_md"] = get_geo_distance(merchant_coords, device_coords)
        data["geo_distance_km"] = get_geo_distance((data["sender_lat"], data["sender_lon"]), (data["device_lat"], data["device_lon"]))

        data["geo_anomaly"] = data["geo_distance_km"] > 200

        #txn_df = pd.read_csv(txn_log_path) if os.path.exists(txn_log_path) else pd.DataFrame(columns=["sender_account", "beneficiary_account", "timestamp"])

        # ✅ Check new beneficiary
        data["is_new_beneficiary"] = is_new_beneficiary(data["sender_account"], data["beneficiary_account"], txn_df)

        # ✅ Ensure all categorical fields exist
        for cat_col in config["features"]["categorical"]:
            data[cat_col] = data.get(cat_col, "Unknown")

        print("✅ Data before DataFrame:", data)

        # ✅ Create DataFrame
        df = pd.DataFrame([data])

        print("✅ Columns in DataFrame:", df.columns.tolist())


        # ✅ Label encode
        for col in config["features"]["categorical"]:
            le = label_encoders[col]
            value = df[col].iloc[0]
            if value not in le.classes_:
                if "Unknown" not in le.classes_:
                    le.classes_ = np.append(le.classes_, "Unknown")
                value = "Unknown"
            df[col + config["encoding_suffix"]] = le.transform([value])

        # ✅ FEATURE BLOCK — FIXED
        feature_cols = (
            config["features"]["numerical"] +
            [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
        )

        print("All DF columns:", df.columns.tolist())
        print("Expected Feature Columns:", feature_cols)

        missing_features = [f for f in feature_cols if f not in df.columns]
        if missing_features:
            return jsonify({"error": f"Missing features in DataFrame: {missing_features}"}), 500

        # ✅ Final input as clean 2D DataFrame
        X = pd.DataFrame([df[feature_cols].iloc[0].values], columns=feature_cols)
        print("Final X shape:", X.shape)
        print("Scaler expects:", rf_scaler.mean_.shape)

        # 🎯 Run RF
        X_rf_scaled = rf_scaler.transform(X)
        rf_pred = int(rf_model.predict(X_rf_scaled)[0])

        # 🔍 Run ISO
        X_iso_scaled = iso_scaler.transform(X)
        anomaly_score = iso_model.decision_function(X_iso_scaled)[0]
        risk_score = float(iso_risk_scaler.transform([[-anomaly_score]])[0][0])
        risk_level = assign_risk(risk_score,config)
        is_repeat = is_rapid_repeat(
            data.get("sender_account", ""),
            data.get("beneficiary_account", ""),
            txn_df
        )
        data["is_rapid_repeat"] = is_repeat

        decision = final_decision(
            rf_pred,
            risk_level,
            geo_anomaly=data.get("geo_anomaly", False),
            rapid_repeat=is_repeat,
            amount=data.get("amount", 0),
            risk_score= risk_score
        )


        # 🧾 Log txn
        txn_log_row = {
            "sender_account": data["sender_account"],
            "beneficiary_account": data["beneficiary_account"],
            "timestamp": data["timestamp"],
            "beneficiary_name": data["beneficiary_name"],
            "beneficiary_branch": data["beneficiary_branch"],
            "beneficiary_bank_name": data["beneficiary_bank_name"],
            "sender_name": data["sender_name"]
        }
        txn_df.loc[len(txn_df)] = txn_log_row
        os.makedirs(os.path.dirname(txn_log_path), exist_ok=True)

        txn_df.to_csv(txn_log_path, index=False)


        
        # 🚨 Escalate manually for extremely high-value transactions
        if data["amount"] >= 5000000: 
            decision = "🔍 Send to Admin"
            risk_level = "⚠️ Medium Risk" if risk_score < config["decision_logic"]["block_threshold"] else "❌ High Risk"


        return jsonify({
            "rf_prediction": rf_pred,
            "anomaly_score": round(anomaly_score, 3),
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "final_decision": decision
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
