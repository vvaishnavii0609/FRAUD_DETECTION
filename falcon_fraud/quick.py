import pandas as pd

df = pd.read_csv("feedback/admin_review_transactions.csv")

# Check how many are still pending
pending_count = (df["human_verdict"] == "🕒 Pending").sum()
print(f"🟡 Pending Transactions: {pending_count}")
