// falcon-fraud-shield-admin/src/utils/api.ts

const API_BASE_URL = 'http://localhost:5000';

export async function getPendingReviews() {
    const response = await fetch(`${API_BASE_URL}/api/admin/pending-reviews`);
    if (!response.ok) {
        throw new Error('Failed to fetch pending reviews');
    }
    return await response.json();
}

export async function reviewTransaction(data: {
    transaction_id: number;
    action: 'approved' | 'rejected';
    note?: string;
    admin_id?: number;
}) {
    const response = await fetch(`${API_BASE_URL}/api/admin/review`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to review transaction');
    }
    return await response.json();
} 