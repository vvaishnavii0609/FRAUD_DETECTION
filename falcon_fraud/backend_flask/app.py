from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
import yaml
from datetime import datetime, timedelta
from utils.feature_engineering import get_timestamp, get_hour, get_geo_distance, is_new_beneficiary
import os
import traceback
import requests
from decision_logic import assign_risk
from flask_sqlalchemy import SQLAlchemy
from models import db, User, Transaction, AdminAction, Notification, OTPSession
from sqlalchemy.exc import SQLAlchemyError
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Config: Use SQLite for demo, or set DATABASE_URL env var for production
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///fraud_detection.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

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
def assign_risk(score, config):
    if score < config["decision_logic"]["review_threshold"]:
        return "✅ Low Risk"
    elif score < config["decision_logic"]["block_threshold"]:
        return "⚠️ Medium Risk"
    else:
        return "❌ High Risk"

# 🧠 Final Decision Logic
def final_decision(rf_pred, risk_level, geo_anomaly=False, rapid_repeat=False, amount=0, risk_score=0.0):
    if risk_level == "❌ High Risk" and amount < 200 and risk_score < 80:
        return "🔍 Send to Admin"
    if rf_pred == 0 and risk_level != "❌ High Risk" and amount < 1000:
        return "✅ Auto-approved"
    if risk_level == "❌ High Risk" and amount >= 200:
        return "🚫 Block & Review"
    if rf_pred == 1:
        if geo_anomaly or rapid_repeat or amount > 100000:
            return "🚫 Block & Review"
        return "🔍 Send to Admin"
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
    return "P2P", "Mobile", 19.076, 72.8777

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

def get_beneficiary_coords_from_ifsc(ifsc):
    return 19.076, 72.8777

def get_time_since_last_txn(sender, txn_df, current_time):
    user_txns = txn_df[txn_df["sender_account"] == sender]
    if user_txns.empty:
        return 0.0
    user_txns["timestamp"] = pd.to_datetime(user_txns["timestamp"])
    last_time = user_txns["timestamp"].max()
    delta = (current_time - last_time).total_seconds() / 60
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

        # ✅ Fallback for missing device_lat/lon
        if "device_lat" not in data or "device_lon" not in data:
            data["device_lat"] = 19.076
            data["device_lon"] = 72.8777
            print("⚠️ Fallback device location used: Mumbai")

        test_mode = data.get("test_mode", False)

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
        for field in optional_fields:
            data[field] = data.get(field, "")

        required_fields = config["required_user_inputs"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {missing}"}), 400

        timestamp = get_timestamp()
        data["timestamp"] = timestamp.isoformat()
        data["hour"] = get_hour(timestamp)

        for coord in ["sender_lat", "sender_lon"]:
            data[coord] = data.get("device_" + coord.split("_")[1], 0.0)

        data["time_diff_mins"] = get_time_diff_mins(
            data["sender_account"], data["beneficiary_account"], txn_df, timestamp)
        data["time_since_last_txn"] = get_time_since_last_txn(
            data["sender_account"], txn_df, timestamp)

        data["merchant_category"], data["device_type"], data["merchant_lat"], data["merchant_lon"] = infer_metadata(data["beneficiary_account"])
        data["beneficiary_lat"], data["beneficiary_lon"] = infer_metadata(data["beneficiary_account"])[2], infer_metadata(data["beneficiary_account"])[3]

        coord_m = (data["merchant_lat"], data["merchant_lon"])
        coord_b = (data["beneficiary_lat"], data["beneficiary_lon"])
        data["distance_km"] = get_geo_distance(coord_m, coord_b)

        merchant_coords = (data["merchant_lat"], data["merchant_lon"])
        device_coords = (data["device_lat"], data["device_lon"])
        data["distance_km_md"] = get_geo_distance(merchant_coords, device_coords)
        data["geo_distance_km"] = get_geo_distance((data["sender_lat"], data["sender_lon"]), (data["device_lat"], data["device_lon"]))
        data["geo_anomaly"] = data["geo_distance_km"] > 200
        data["is_new_beneficiary"] = is_new_beneficiary(data["sender_account"], data["beneficiary_account"], txn_df)

        for cat_col in config["features"]["categorical"]:
            data[cat_col] = data.get(cat_col, "Unknown")

        df = pd.DataFrame([data])

        for col in config["features"]["categorical"]:
            le = label_encoders[col]
            value = df[col].iloc[0]
            if value not in le.classes_:
                if "Unknown" not in le.classes_:
                    le.classes_ = np.append(le.classes_, "Unknown")
                value = "Unknown"
            df[col + config["encoding_suffix"]] = le.transform([value])

        feature_cols = (
            config["features"]["numerical"] +
            [col + config["encoding_suffix"] for col in config["features"]["categorical"]]
        )

        missing_features = [f for f in feature_cols if f not in df.columns]
        if missing_features:
            return jsonify({"error": f"Missing features in DataFrame: {missing_features}"}), 500

        X = pd.DataFrame([df[feature_cols].iloc[0].values], columns=feature_cols)
        X_rf_scaled = rf_scaler.transform(X)
        rf_pred = int(rf_model.predict(X_rf_scaled)[0])

        X_iso_scaled = iso_scaler.transform(X)
        anomaly_score = iso_model.decision_function(X_iso_scaled)[0]
        risk_score = float(iso_risk_scaler.transform([[-anomaly_score]])[0][0])
        risk_level = assign_risk(risk_score, config)
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
            risk_score=risk_score
        )

        if not test_mode:
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

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    data = request.get_json()
    user_id = data.get('user_id')
    amount = data.get('amount')
    # All other details go into the details JSON field
    details = {k: v for k, v in data.items() if k not in ['user_id', 'amount']}
    if not user_id or not amount:
        return jsonify({'error': 'user_id and amount are required'}), 400
    try:
        # Placeholder: Run fraud detection model here and set risk_score/status
        risk_score = 0.5  # TODO: Replace with real model
        status = 'flagged' if risk_score > 0.7 else 'approved'
        txn = Transaction(user_id=user_id, amount=amount, details=details, risk_score=risk_score, status=status)
        db.session.add(txn)
        db.session.commit()
        return jsonify({
            'id': txn.id,
            'user_id': txn.user_id,
            'amount': str(txn.amount),
            'details': txn.details,
            'status': txn.status,
            'risk_score': txn.risk_score,
            'created_at': txn.created_at.isoformat()
        }), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    return 'Fraud Detection Backend Running'

# CLI command to initialize the database
def create_db():
    with app.app_context():
        db.create_all()
        print('Database tables created.')

if __name__ == '__main__':
    # For demo: create DB if not exists
    create_db()
    app.run(debug=True)
