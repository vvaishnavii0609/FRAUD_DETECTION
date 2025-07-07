from datetime import datetime
from geopy.distance import geodesic

def get_timestamp():
    return datetime.utcnow()

def get_hour(timestamp):
    return timestamp.hour

def get_geo_distance(coord1, coord2):
    try:
        return geodesic(coord1, coord2).km
    except:
        return 0.0

def is_new_beneficiary(sender_account, beneficiary_account, txn_df):
    prev = txn_df[
        (txn_df["sender_account"] == sender_account) &
        (txn_df["beneficiary_account"] == beneficiary_account)
    ]
    return 1 if prev.empty else 0
