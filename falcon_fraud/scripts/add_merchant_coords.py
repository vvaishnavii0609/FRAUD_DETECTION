import pandas as pd
from geopy.geocoders import Nominatim
import time

# Load your transaction dataset
df = pd.read_csv("transactionsnew2.csv")

# Extract unique merchant info with location details
merchant_df = df[[
    "beneficiary_account",
    "beneficiary_branch_name",
    "beneficiary_city",
    "beneficiary_bank_name"
]].drop_duplicates(subset=["beneficiary_account"])

# Initialize geolocator
geolocator = Nominatim(user_agent="falcon_fraud_geocoder")

location_cache = {}
def get_coords(branch, city, bank):
    parts = [p for p in [city, "India"] if p and str(p).strip()]
    query = ", ".join(parts)
    print(f"Geocoding query: '{query}'")
    try:
        location = geolocator.geocode(query)
        if location:
            return (location.latitude, location.longitude)
        else:
            return (0.0, 0.0)
    except Exception as e:
        print(f"Error geocoding '{query}': {e}")
        return (0.0, 0.0)


# Add lat/lon columns
merchant_df["merchant_lat"] = 0.0
merchant_df["merchant_lon"] = 0.0

for idx, row in merchant_df.iterrows():
    lat, lon = get_coords(row["beneficiary_branch_name"], row["beneficiary_city"], row["beneficiary_bank_name"])
    merchant_df.at[idx, "merchant_lat"] = lat
    merchant_df.at[idx, "merchant_lon"] = lon
    print(f"Geocoded {row['beneficiary_account']}: ({lat}, {lon})")
    time.sleep(1)  # polite pause for API

# Save the enriched merchant metadata CSV
merchant_df.to_csv("backend_flask/merchant_metadata_enriched.csv", index=False)
print("✅ merchant_metadata_enriched.csv saved!")
