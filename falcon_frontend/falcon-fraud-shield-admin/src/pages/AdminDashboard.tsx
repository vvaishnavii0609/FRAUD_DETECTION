import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPendingReviews, reviewTransaction } from "@/utils/api";
import { toast } from "sonner";
import { FraudAnalytics } from "@/components/FraudAnalytics";

interface PendingReview {
  id: number;
  user_name: string;
  user_phone: string;
  amount: string;
  details: any;
  risk_score: number;
  created_at: string;
}

export default function AdminDashboard() {
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchPendingReviews();
    fetchAllTransactions();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      const reviews = await getPendingReviews();
      setPendingReviews(reviews);
    } catch (error) {
      toast.error("Failed to fetch pending reviews");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTransactions = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/all-transactions");
      if (response.ok) {
        const txs = await response.json();
        // Map riskLevel for analytics
        setAllTransactions(
          txs.map((tx: any) => ({
            ...tx,
            riskScore: tx.risk_score,
            riskLevel:
              tx.risk_score >= 0.7 ? "high" :
              tx.risk_score >= 0.4 ? "medium" : "low",
            channel: tx.details?.channel || "Unknown",
            amount: tx.amount
          }))
        );
      }
    } catch (error) {
      // ignore
    }
  };

  const handleReview = async (transactionId: number, action: 'approved' | 'rejected') => {
    try {
      await reviewTransaction({
        transaction_id: transactionId,
        action,
        note: `Admin ${action} this transaction`,
        admin_id: 1
      });
      
      toast.success(`Transaction ${action} successfully`);
      fetchPendingReviews(); // Refresh the list
      fetchAllTransactions(); // Refresh analytics
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Button onClick={fetchPendingReviews} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Analytics Section */}
        <FraudAnalytics transactions={allTransactions} />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pending Transaction Reviews
                <Badge variant="secondary">{pendingReviews.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No pending reviews</p>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.map((review) => (
                    <Card key={review.id} className="border-l-4 border-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <h3 className="font-semibold">{review.user_name}</h3>
                              <span className="text-sm text-gray-500">{review.user_phone}</span>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              ₹{parseFloat(review.amount).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              <div>Channel: {review.details?.channel || 'N/A'}</div>
                              <div>Risk Score: {review.risk_score?.toFixed(2) || 'N/A'}</div>
                              <div>Date: {new Date(review.created_at).toLocaleString()}</div>
                            </div>
                            {review.details && (
                              <div className="text-sm text-gray-500">
                                <div>To: {review.details.beneficiaryCustomerName} ({review.details.beneficiaryAccount})</div>
                                <div>IFSC: {review.details.ifsc}</div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReview(review.id, 'approved')}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReview(review.id, 'rejected')}
                              variant="destructive"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
