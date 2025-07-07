# tests/test_api.py

import requests
import json
import os

API_URL = "http://localhost:5000/predict"

BASE_DIR = os.path.dirname(__file__)  # directory of this test_api.py
def load_payload(name):
    path = os.path.join(BASE_DIR, "test_payloads", f"{name}.json")
    with open(path) as f:
        return json.load(f)


def test_legit_transaction():
    payload = load_payload("legit_txn")
    res = requests.post(API_URL, json=payload)
    assert res.status_code == 200
    assert res.json()["final_decision"] in ["✅ Auto-approved", "🔍 Send to Admin"]

def test_fraud_transaction():
    payload = load_payload("fraud_txn")
    res = requests.post(API_URL, json=payload)
    assert res.status_code == 200
    assert res.json()["final_decision"] in ["🚫 Block & Review", "🔍 Send to Admin"]

def test_missing_fields():
    payload = load_payload("missing_fields")
    res = requests.post(API_URL, json=payload)
    assert res.status_code == 400

def test_geo_anomaly():
    payload = load_payload("geo_anomaly")
    res = requests.post(API_URL, json=payload)
    assert res.status_code == 200
    assert "risk_level" in res.json()

def test_rapid_repeat():
    payload = load_payload("rapid_repeat")
    res = requests.post(API_URL, json=payload)
    assert res.status_code == 200
