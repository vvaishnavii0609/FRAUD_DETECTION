import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { FraudAnalytics } from "@/components/FraudAnalytics";
import { mockFraudDetection } from "@/utils/fraudDetection";

interface Transaction {
  id: string;
  amount: string;
  channel: string;
  beneficiary: string;
  ifsc: string;
  senderAccount: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  riskScore?: number;
  anomalyScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  fraudProbability?: number;
  beneficiaryAccount?: string;
  risk_level?: string;
  risk_score?: number;
  anomaly_score?: number;
}

const AdminDashboard = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    flagged: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    const stored = JSON.parse(localStorage.getItem('transactions') || '[]');
    const processedTransactions = stored.map((tx: Transaction) => {
      if (!tx.riskScore) {
        const analysis = mockFraudDetection(tx);
        return { ...tx, ...analysis };
      }
      return tx;
    });
    
    setTransactions(processedTransactions);
    localStorage.setItem('transactions', JSON.stringify(processedTransactions));
    
    // Calculate stats
    const total = processedTransactions.length;
    const flagged = processedTransactions.filter((tx: Transaction) => tx.riskLevel === 'high').length;
    const approved = processedTransactions.filter((tx: Transaction) => tx.status === 'approved').length;
    const rejected = processedTransactions.filter((tx: Transaction) => tx.status === 'rejected').length;
    
    setStats({ total, flagged, approved, rejected });
  };

  const handleTransactionAction = (id: string, action: 'approve' | 'reject') => {
    const updatedTransactions = transactions.map(tx => 
      tx.id === id ? { ...tx, status: action === 'approve' ? 'approved' as const : 'rejected' as const } : tx
    );
    setTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
    loadTransactions();
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Falcon Fraud</span>
              <Badge variant="outline" className="ml-2">Admin</Badge>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                User Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and review transactions flagged by AI fraud detection</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Flagged (High Risk)</p>
                  <p className="text-3xl font-bold text-red-600">{stats.flagged}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-3xl font-bold text-gray-600">{stats.rejected}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fraud Analytics */}
        <FraudAnalytics transactions={transactions} />

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Transaction Review</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No transactions to review</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Anomaly Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">{transaction.timestamp || '-'}</TableCell>
                      <TableCell className="font-semibold">₹{transaction.amount}</TableCell>
                      <TableCell>{transaction.beneficiaryAccount || '-'}</TableCell>
                      <TableCell>{transaction.riskLevel || transaction.risk_level || '-'}</TableCell>
                      <TableCell>{transaction.riskScore || transaction.risk_score || '-'}</TableCell>
                      <TableCell>{transaction.anomalyScore || transaction.anomaly_score || '-'}</TableCell>
                      <TableCell>{transaction.status}</TableCell>
                      <TableCell>
                        {transaction.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleTransactionAction(transaction.id, 'approve')}>Approve</Button>
                            <Button size="sm" variant="destructive" className="ml-2" onClick={() => handleTransactionAction(transaction.id, 'reject')}>Reject</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
