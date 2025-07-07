// Mock AI fraud detection algorithms
// Simulates Random Forest and Isolation Forest models

interface Transaction {
  amount: string;
  channel: string;
  beneficiary: string;
  ifsc: string;
  senderAccount: string;
  timestamp: string;
}

interface FraudAnalysis {
  riskScore: number;
  anomalyScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  fraudProbability: number;
}

export function mockFraudDetection(tx: any) {
  // Use new field names and provide defaults
  const amount = Number(tx.amount) || 0;
  const channel = tx.channel || "";
  const beneficiary = tx.beneficiaryAccount || tx.beneficiary || "";
  const senderPhone = tx.senderPhone || "";
  const senderAccount = tx.senderAccount || "";
  const ifsc = tx.ifsc || "";
  const description = tx.description || "";

  // Example mock logic (customize as needed)
  let riskLevel = "low";
  let riskScore = 10;
  let anomalyScore = 0.1;

  if (amount > 100000) {
    riskLevel = "high";
    riskScore = 90;
    anomalyScore = 0.9;
  } else if (amount > 10000) {
    riskLevel = "medium";
    riskScore = 50;
    anomalyScore = 0.5;
  }

  // Example: flag if beneficiary account number is short
  if (beneficiary.length < 6) {
    riskLevel = "high";
    riskScore = 95;
    anomalyScore = 0.95;
  }

  // Example: flag if IFSC is missing or invalid
  if (!/^[A-Za-z]{4}\d{7}$/.test(ifsc)) {
    riskLevel = "high";
    riskScore = 99;
    anomalyScore = 0.99;
  }

  return {
    riskLevel: riskLevel as 'low' | 'medium' | 'high',
    riskScore,
    anomalyScore,
    fraudProbability: (riskScore + anomalyScore) / 2
  };
}

// Simulate batch processing for multiple transactions
export const processBatchTransactions = (transactions: Transaction[]): (Transaction & FraudAnalysis)[] => {
  return transactions.map(tx => ({
    ...tx,
    ...mockFraudDetection(tx)
  }));
};
