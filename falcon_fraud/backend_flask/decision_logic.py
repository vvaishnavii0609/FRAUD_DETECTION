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
  
  # backend_flask/decision_logic.py

def assign_risk(score, config):
    if score < config["decision_logic"]["review_threshold"]:
        return "✅ Low Risk"
    elif score < config["decision_logic"]["block_threshold"]:
        return "⚠️ Medium Risk"
    else:
        return "❌ High Risk"
