import pandas as pd

# 📄 Load your main transaction dataset
df = pd.read_csv("transactionsnew2.csv")

# ✅ Extract relevant columns
merchant_df = df[["beneficiary_account", "merchant_name", "merchant_category", "device_type"]]

# 🧹 Drop duplicates and missing
merchant_df = merchant_df.dropna(subset=["beneficiary_account", "merchant_name"])
merchant_df = merchant_df.drop_duplicates(subset=["beneficiary_account"])

# 💾 Save updated metadata
merchant_df.to_csv("merchant_metadata.csv", index=False)

print("✅ merchant_metadata.csv created with", len(merchant_df), "rows.")
