import pandas as pd
from geopy.geocoders import Nominatim
import time
import os

# Load the full transactions dataset
df = pd.read_csv("transactionsnew2.csv")

# Extract unique merchants
merchant_df = df[[
    "beneficiary_account",
    "beneficiary_branch_name",
    "beneficiary_city",
    "beneficiary_bank_name"
]].drop_duplicates(subset=["beneficiary_account"])

# Output path
output_path = "backend_flask/merchant_metadata_enriched.csv"

# If enriched file already exists, resume from there
if os.path.exists(output_path):
    enriched_df = pd.read_csv(output_path)
    processed_accounts = set(enriched_df["beneficiary_account"])
    print(f"🔁 Resuming — {len(processed_accounts)} accounts already processed.")
else:
    enriched_df = pd.DataFrame(columns=[
        "beneficiary_account", "beneficiary_branch_name",
        "beneficiary_city", "beneficiary_bank_name",
        "merchant_lat", "merchant_lon"
    ])
    processed_accounts = set()

# Init geolocator
geolocator = Nominatim(user_agent="falcon_fraud_geocoder")

def get_coords(branch, city, bank):
    parts = [p for p in [city, "India"] if p and str(p).strip()]
    query = ", ".join(parts)
    print(f"📍 Geocoding query: '{query}'")
    try:
        location = geolocator.geocode(query)
        if location:
            return (location.latitude, location.longitude)
        else:
            return (0.0, 0.0)
    except Exception as e:
        print(f"❌ Error geocoding '{query}': {e}")
        return (0.0, 0.0)

batch = []
for idx, row in merchant_df.iterrows():
    acc = row["beneficiary_account"]
    if acc in processed_accounts:
        continue

    lat, lon = get_coords(row["beneficiary_branch_name"], row["beneficiary_city"], row["beneficiary_bank_name"])

    enriched_row = {
        "beneficiary_account": acc,
        "beneficiary_branch_name": row["beneficiary_branch_name"],
        "beneficiary_city": row["beneficiary_city"],
        "beneficiary_bank_name": row["beneficiary_bank_name"],
        "merchant_lat": lat,
        "merchant_lon": lon
    }

    enriched_df = pd.concat([enriched_df, pd.DataFrame([enriched_row])], ignore_index=True)

    processed_accounts.add(acc)

    print(f"✅ Geocoded {acc}: ({lat}, {lon})")
    time.sleep(1)

    # Save every 10 rows
    if len(enriched_df) % 10 == 0:
        enriched_df.to_csv(output_path, index=False)
        print("💾 Auto-saved progress...")

# Final save
enriched_df.to_csv(output_path, index=False)
print("✅ All merchant coordinates saved!")
