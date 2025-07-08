// falcon-fraud-shield-user/src/utils/api.ts
export async function submitTransaction(transactionData: any) {
    const response = await fetch('http://localhost:5000/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers here if needed
      },
      body: JSON.stringify(transactionData),
    });
    if (!response.ok) {
      throw new Error('Failed to submit transaction');
    }
    return await response.json();
  }