from backend_flask.decision_logic import final_decision  # Replace 'your_module' with the actual filename (without .py)

def test_high_risk_low_amount_should_go_to_admin():
    rf_pred = 0
    risk_level = "❌ High Risk"
    amount = 50
    risk_score = 72.9
    geo_anomaly = False
    rapid_repeat = False

    decision = final_decision(
        rf_pred=rf_pred,
        risk_level=risk_level,
        geo_anomaly=geo_anomaly,
        rapid_repeat=rapid_repeat,
        amount=amount,
        risk_score=risk_score
    )

    assert decision == "🔍 Send to Admin"

def test_safe_low_amount_transaction():
    decision = final_decision(
        rf_pred=0,
        risk_level="✅ Low Risk",
        geo_anomaly=False,
        rapid_repeat=False,
        amount=500,
        risk_score=25.0
    )
    assert decision == "✅ Auto-approved"

def test_high_risk_high_amount_should_block():
    decision = final_decision(
        rf_pred=0,
        risk_level="❌ High Risk",
        geo_anomaly=False,
        rapid_repeat=False,
        amount=10000,
        risk_score=90.0
    )
    assert decision == "🚫 Block & Review"

def test_predicted_fraud_with_geo_anomaly_should_block():
    decision = final_decision(
        rf_pred=1,
        risk_level="⚠️ Medium Risk",
        geo_anomaly=True,
        rapid_repeat=False,
        amount=1500,
        risk_score=65.0
    )
    assert decision == "🚫 Block & Review"

def test_predicted_fraud_without_flags_should_go_to_admin():
    decision = final_decision(
        rf_pred=1,
        risk_level="⚠️ Medium Risk",
        geo_anomaly=False,
        rapid_repeat=False,
        amount=800,
        risk_score=60.0
    )
    assert decision == "🔍 Send to Admin"
