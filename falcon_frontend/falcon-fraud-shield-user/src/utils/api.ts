// falcon-fraud-shield-user/src/utils/api.ts

const API_BASE_URL = 'http://localhost:5000';

export async function submitTransaction(transactionData: any) {
    const response = await fetch(`${API_BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });
    if (!response.ok) {
      throw new Error('Failed to submit transaction');
    }
    return await response.json();
}

export async function registerUser(userData: { name: string; phone: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to register user');
    }
    return await response.json();
}

export async function generateOTP(phone: string) {
    const response = await fetch(`${API_BASE_URL}/api/generate-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate OTP');
    }
    return await response.json();
}

export async function verifyOTP(userId: number, otp: string) {
    const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, otp }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify OTP');
    }
    return await response.json();
}

export async function getNotifications(userId: number) {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }
    return await response.json();
}