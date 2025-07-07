# tests/test_helpers.py

import pytest
import pandas as pd
from datetime import datetime, timedelta
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from utils.feature_engineering import get_geo_distance, get_hour, is_new_beneficiary

def test_get_geo_distance():
    d = get_geo_distance((19.0760, 72.8777), (28.7041, 77.1025))  # Mumbai to Delhi
    assert round(d) in range(1100, 1600)

def test_get_hour():
    dt = datetime(2025, 7, 2, 15, 45)
    assert get_hour(dt) == 15

def test_is_new_beneficiary():
    df = pd.DataFrame([
        {"sender_account": "A1", "beneficiary_account": "B1", "timestamp": "2025-07-01"}
    ])
    assert is_new_beneficiary("A1", "B1", df) == 0
    assert is_new_beneficiary("A1", "B2", df) == 1
