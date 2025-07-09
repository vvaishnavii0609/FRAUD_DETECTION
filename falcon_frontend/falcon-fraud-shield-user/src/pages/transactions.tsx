import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Transactions = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [filter, setFilter] = useState({ date: "", amount: "", beneficiary: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    if (u?.id) {
      fetchUserTransactions(u.id);
    }
  }, []);

  const fetchUserTransactions = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/transactions?user_id=${userId}`);
      if (response.ok) {
        const transactions = await response.json();
        setHistory(transactions);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const filteredHistory = history.filter(tx => {
    const matchDate = filter.date ? tx.created_at?.slice(0, 10) === filter.date : true;
    const matchAmount = filter.amount ? tx.amount === filter.amount : true;
    const matchBeneficiary = filter.beneficiary ? tx.details?.beneficiaryAccount?.includes(filter.beneficiary) : true;
    return matchDate && matchAmount && matchBeneficiary;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-sans">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-900">Transaction History</h1>
          <Button variant="outline" onClick={() => navigate("/main")}>Back to Dashboard</Button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            type="date"
            value={filter.date}
            onChange={e => setFilter({ ...filter, date: e.target.value })}
            placeholder="Filter by date"
            className="w-40"
          />
          <Input
            type="number"
            value={filter.amount}
            onChange={e => setFilter({ ...filter, amount: e.target.value })}
            placeholder="Filter by amount"
            className="w-40"
          />
          <Input
            type="text"
            value={filter.beneficiary}
            onChange={e => setFilter({ ...filter, beneficiary: e.target.value })}
            placeholder="Filter by beneficiary"
            className="w-48"
          />
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Your Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Amount</th>
                      <th className="text-left p-2">Beneficiary Name</th>
                      <th className="text-left p-2">Beneficiary Account</th>
                      <th className="text-left p-2">IFSC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((tx) => (
                      <tr key={tx.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-sm">{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td className="p-2 font-semibold">₹{parseFloat(tx.amount).toLocaleString()}</td>
                        <td className="p-2 text-sm">{tx.details?.beneficiaryCustomerName || 'N/A'}</td>
                        <td className="p-2 text-sm">{tx.details?.beneficiaryAccount || 'N/A'}</td>
                        <td className="p-2 text-sm">{tx.details?.ifsc || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions; 