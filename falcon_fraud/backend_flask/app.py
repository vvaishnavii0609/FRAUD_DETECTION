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
import random
import hashlib
from sqlalchemy import func, desc

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
if os.path.exists(txn_log_path):
    txn_df = pd.read_csv(txn_log_path)
else:
    columns = ["sender_account", "beneficiary_account", "timestamp", "beneficiary_name", "beneficiary_branch", "beneficiary_bank_name", "sender_name"]
    txn_df = pd.DataFrame(columns=columns)

# �� Risk score mapping
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
        if data is None:
            data = {}
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
        # Run fraud detection on the transaction
        fraud_data = {
            'amount': float(amount),
            'sender_account': details.get('senderAccount', ''),
            'beneficiary_account': details.get('beneficiaryAccount', ''),
            'channel': details.get('channel', 'NEFT'),
            'sender_phone': details.get('senderPhone', ''),
            'beneficiary_name': details.get('beneficiaryCustomerName', ''),
            'beneficiary_branch': details.get('beneficiaryBankBranch', ''),
            'ifsc': details.get('ifsc', ''),
            'device_lat': 19.076,  # Default Mumbai coordinates
            'device_lon': 72.8777,
            'test_mode': False
        }
        
        # Call the fraud detection endpoint
        fraud_response = predict_fraud(fraud_data)
        
        # Determine status based on fraud detection result
        if fraud_response['final_decision'] == '🚫 Block & Review':
            status = 'blocked'
        elif fraud_response['final_decision'] == '🔍 Send to Admin':
            status = 'pending_admin_review'
        elif fraud_response['final_decision'] == '✅ Auto-approved':
            status = 'approved'
        else: # This case should ideally not happen for a new transaction
            status = 'flagged'
        
        # Create transaction record
        txn = Transaction()
        txn.user_id = user_id
        txn.amount = amount
        txn.details = details
        txn.risk_score = fraud_response['risk_score']
        txn.status = status
        db.session.add(txn)
        db.session.commit()
        
        # Create notification for user
        notification = Notification()
        notification.user_id = user_id
        notification.message = f"Transaction {status}. Risk Score: {fraud_response['risk_score']:.2f}"
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'id': txn.id,
            'user_id': txn.user_id,
            'amount': str(txn.amount),
            'details': txn.details,
            'status': txn.status,
            'risk_score': txn.risk_score,
            'fraud_detection': fraud_response,
            'created_at': txn.created_at.isoformat()
        }), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/transactions', methods=['GET'])
def get_user_transactions():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'user_id required'}), 400
    txns = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.created_at.desc()).all()
    return jsonify([
        {
            'id': txn.id,
            'amount': str(txn.amount),
            'status': txn.status,
            'risk_score': txn.risk_score,
            'details': txn.details,
            'created_at': txn.created_at.isoformat()
        } for txn in txns
    ])

def predict_fraud(data):
    """Internal function to run fraud detection"""
    try:
        # Apply RBI rules
        def apply_rbi_rules(data):
            txn_type = data.get("channel")
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
            return {
                "rf_prediction": 1,
                "anomaly_score": 0.0,
                "risk_score": 100.0,
                "risk_level": "❌ High Risk",
                "final_decision": "🚫 Block & Review",
                "violation_reason": data["violation_reason"]
            }

        # Feature engineering
        timestamp = get_timestamp()
        data["timestamp"] = timestamp.isoformat()
        data["hour"] = get_hour(timestamp)
        data["transaction_type"] = data.get("channel", "NEFT")

        # Add missing fields
        optional_fields = ["beneficiary_name", "beneficiary_branch", "beneficiary_bank_name", "sender_name", "sender_address"]
        for field in optional_fields:
            data[field] = data.get(field, "")

        # Feature engineering
        data["time_diff_mins"] = get_time_diff_mins(data["sender_account"], data["beneficiary_account"], txn_df, timestamp)
        data["time_since_last_txn"] = get_time_since_last_txn(data["sender_account"], txn_df, timestamp)
        data["merchant_category"], data["device_type"], data["merchant_lat"], data["merchant_lon"] = infer_metadata(data["beneficiary_account"])
        data["beneficiary_lat"], data["beneficiary_lon"] = infer_metadata(data["beneficiary_account"])[2], infer_metadata(data["beneficiary_account"])[3]
        
        # Distance calculations
        coord_m = (data["merchant_lat"], data["merchant_lon"])
        coord_b = (data["beneficiary_lat"], data["beneficiary_lon"])
        data["distance_km"] = get_geo_distance(coord_m, coord_b)
        merchant_coords = (data["merchant_lat"], data["merchant_lon"])
        device_coords = (data["device_lat"], data["device_lon"])
        data["distance_km_md"] = get_geo_distance(merchant_coords, device_coords)
        data["geo_distance_km"] = get_geo_distance((data.get("sender_lat", 0), data.get("sender_lon", 0)), (data["device_lat"], data["device_lon"]))
        data["geo_anomaly"] = data["geo_distance_km"] > 200
        data["is_new_beneficiary"] = is_new_beneficiary(data["sender_account"], data["beneficiary_account"], txn_df)

        # Prepare features for ML models
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

        X = pd.DataFrame([df[feature_cols].iloc[0].values], columns=feature_cols)
        X_rf_scaled = rf_scaler.transform(X)
        rf_pred = int(rf_model.predict(X_rf_scaled)[0])

        X_iso_scaled = iso_scaler.transform(X)
        anomaly_score = iso_model.decision_function(X_iso_scaled)[0]
        risk_score = float(iso_risk_scaler.transform([[-anomaly_score]])[0][0])
        risk_level = assign_risk(risk_score, config)
        
        is_repeat = is_rapid_repeat(data.get("sender_account", ""), data.get("beneficiary_account", ""), txn_df)
        decision = final_decision(rf_pred, risk_level, geo_anomaly=data.get("geo_anomaly", False), rapid_repeat=is_repeat, amount=data.get("amount", 0), risk_score=risk_score)

        if data["amount"] >= 5000000:
            decision = "🔍 Send to Admin"
            risk_level = "⚠️ Medium Risk" if risk_score < config["decision_logic"]["block_threshold"] else "❌ High Risk"

        return {
            "rf_prediction": rf_pred,
            "anomaly_score": round(anomaly_score, 3),
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "final_decision": decision
        }

    except Exception as e:
        traceback.print_exc()
        return {
            "rf_prediction": 0,
            "anomaly_score": 0.0,
            "risk_score": 50.0,
            "risk_level": "⚠️ Medium Risk",
            "final_decision": "🔍 Send to Admin",
            "error": str(e)
        }

# User registration endpoint
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    name = data.get('name')
    phone = data.get('phone')
    password = data.get('password')
    
    if not all([name, phone, password]):
        return jsonify({'error': 'All fields are required'}), 400
    
    try:
        # Check if user already exists
        existing_user = User.query.filter_by(phone=phone).first()
        if existing_user:
            return jsonify({'error': 'User already exists'}), 400
        
        # Create new user
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        user = User()
        user.name = name
        user.phone = phone
        user.password_hash = password_hash
        user.email = f"{phone}@example.com"
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'phone': user.phone,
            'message': 'User registered successfully'
        }), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Generate OTP endpoint
@app.route('/api/generate-otp', methods=['POST'])
def generate_otp():
    data = request.get_json()
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'error': 'Phone number is required'}), 400
    
    try:
        user = User.query.filter_by(phone=phone).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Generate OTP
        otp = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        
        # Create OTP session
        otp_session = OTPSession(user_id=user.id, otp=otp, expires_at=expires_at)
        db.session.add(otp_session)
        db.session.commit()
        
        # In production, send OTP via SMS
        print(f"OTP for {phone}: {otp}")
        
        return jsonify({
            'message': 'OTP sent successfully',
            'user_id': user.id
        }), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Verify OTP endpoint
@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    user_id = data.get('user_id')
    otp = data.get('otp')
    
    if not all([user_id, otp]):
        return jsonify({'error': 'User ID and OTP are required'}), 400
    
    try:
        # Find valid OTP session
        otp_session = OTPSession.query.filter_by(
            user_id=user_id,
            otp=otp,
            used=False
        ).filter(OTPSession.expires_at > datetime.utcnow()).first()
        
        if not otp_session:
            return jsonify({'error': 'Invalid or expired OTP'}), 400
        
        # Mark OTP as used
        otp_session.used = True
        db.session.commit()
        
        # Get user details
        user = User.query.get(user_id)
        
        return jsonify({
            'id': user.id,
            'name': user.name,
            'phone': user.phone,
            'message': 'OTP verified successfully'
        }), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get pending admin reviews
@app.route('/api/admin/pending-reviews', methods=['GET'])
def get_pending_reviews():
    try:
        pending_transactions = Transaction.query.filter_by(status='pending_admin_review').all()
        
        reviews = []
        for txn in pending_transactions:
            user = User.query.get(txn.user_id)
            reviews.append({
                'id': txn.id,
                'user_name': user.name if user else 'Unknown',
                'user_phone': user.phone if user else 'Unknown',
                'amount': str(txn.amount),
                'details': txn.details,
                'risk_score': txn.risk_score,
                'created_at': txn.created_at.isoformat()
            })
        
        return jsonify(reviews), 200
    except SQLAlchemyError as e:
        return jsonify({'error': str(e)}), 500

# Admin review action
@app.route('/api/admin/review', methods=['POST'])
def admin_review():
    data = request.get_json()
    transaction_id = data.get('transaction_id')
    action = data.get('action')  # 'approved' or 'rejected'
    note = data.get('note', '')
    admin_id = data.get('admin_id', 1)  # Default admin ID
    
    if not all([transaction_id, action]):
        return jsonify({'error': 'Transaction ID and action are required'}), 400
    
    try:
        transaction = Transaction.query.get(transaction_id)
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        # Update transaction status
        transaction.status = action
        
        # Create admin action record
        admin_action = AdminAction(
            admin_id=admin_id,
            transaction_id=transaction_id,
            action=action,
            note=note
        )
        db.session.add(admin_action)
        
        # Create notification for user
        notification = Notification(
            user_id=transaction.user_id,
            message=f"Your transaction has been {action}. {note}"
        )
        db.session.add(notification)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Transaction {action} successfully',
            'transaction_id': transaction_id
        }), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get user notifications
@app.route('/api/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    try:
        notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(10).all()
        
        return jsonify([{
            'id': n.id,
            'message': n.message,
            'read': n.read,
            'created_at': n.created_at.isoformat()
        } for n in notifications]), 200
    except SQLAlchemyError as e:
        return jsonify({'error': str(e)}), 500

# Get all transactions (for admin analytics)
@app.route('/api/all-transactions', methods=['GET'])
def get_all_transactions():
    try:
        transactions = Transaction.query.order_by(Transaction.created_at.desc()).all()
        return jsonify([
            {
                'id': txn.id,
                'user_id': txn.user_id,
                'amount': str(txn.amount),
                'status': txn.status,
                'risk_score': txn.risk_score,
                'details': txn.details,
                'created_at': txn.created_at.isoformat()
            } for txn in transactions
        ]), 200
    except SQLAlchemyError as e:
        return jsonify({'error': str(e)}), 500

# === ADMIN ANALYTICS ENDPOINTS ===
@app.route('/api/admin/analytics/time-trends', methods=['GET'])
def analytics_time_trends():
    # Returns daily risk score averages and counts
    results = db.session.query(
        func.date(Transaction.created_at).label('date'),
        func.avg(Transaction.risk_score).label('avg_risk_score'),
        func.count(Transaction.id).label('txn_count')
    ).group_by(func.date(Transaction.created_at)).order_by('date').all()
    return jsonify([
        {'date': str(r.date), 'avg_risk_score': float(r.avg_risk_score or 0), 'txn_count': r.txn_count}
        for r in results
    ])

@app.route('/api/admin/analytics/top-risky-users', methods=['GET'])
def analytics_top_risky_users():
    # Returns users with most high-risk transactions
    high_risk = db.session.query(
        Transaction.user_id,
        func.count(Transaction.id).label('high_risk_count')
    ).filter(Transaction.risk_score >= 80).group_by(Transaction.user_id).order_by(desc('high_risk_count')).limit(10).all()
    users = {u.id: u for u in User.query.filter(User.id.in_([r.user_id for r in high_risk])).all()}
    return jsonify([
        {'user_id': r.user_id, 'user_name': users.get(r.user_id).name if users.get(r.user_id) else 'Unknown', 'high_risk_count': r.high_risk_count}
        for r in high_risk
    ])

@app.route('/api/admin/analytics/top-risky-beneficiaries', methods=['GET'])
def analytics_top_risky_beneficiaries():
    # Returns beneficiaries with most high-risk transactions
    txns = Transaction.query.filter(Transaction.risk_score >= 80).all()
    from collections import Counter
    beneficiaries = [t.details.get('beneficiary_account', 'Unknown') for t in txns if t.details]
    counter = Counter(beneficiaries)
    top = counter.most_common(10)
    return jsonify([
        {'beneficiary_account': b, 'high_risk_count': c}
        for b, c in top
    ])

@app.route('/api/admin/analytics/geo', methods=['GET'])
def analytics_geo():
    # Returns transactions with geo info and risk
    txns = Transaction.query.order_by(Transaction.created_at.desc()).limit(200).all()
    result = []
    for t in txns:
        if t.details:
            lat = t.details.get('device_lat') or t.details.get('merchant_lat')
            lon = t.details.get('device_lon') or t.details.get('merchant_lon')
            if lat and lon:
                result.append({
                    'id': t.id,
                    'user_id': t.user_id,
                    'amount': float(t.amount),
                    'risk_score': t.risk_score,
                    'status': t.status,
                    'lat': lat,
                    'lon': lon,
                    'created_at': t.created_at.isoformat()
                })
    return jsonify(result)

@app.route('/api/admin/audit-log', methods=['GET'])
def admin_audit_log():
    # Returns admin actions with user, transaction, action, timestamp
    actions = AdminAction.query.order_by(AdminAction.timestamp.desc()).limit(100).all()
    users = {u.id: u for u in User.query.filter(User.id.in_([a.admin_id for a in actions])).all()}
    txns = {t.id: t for t in Transaction.query.filter(Transaction.id.in_([a.transaction_id for a in actions])).all()}
    return jsonify([
        {
            'id': a.id,
            'admin_id': a.admin_id,
            'admin_name': users.get(a.admin_id).name if users.get(a.admin_id) else 'Unknown',
            'transaction_id': a.transaction_id,
            'amount': float(txns[a.transaction_id].amount) if txns.get(a.transaction_id) else None,
            'action': a.action,
            'note': a.note,
            'timestamp': a.timestamp.isoformat()
        }
        for a in actions
    ])

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
