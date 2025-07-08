import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/Header";

const Transactions = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState({ date: "", amount: "", beneficiary: "" });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    const allTx = JSON.parse(localStorage.getItem("transactions") || "[]");
    // Filter transactions for this user (by account or phone)
    const userTx = allTx.filter((tx: any) =>
      tx.senderAccount === user?.account || tx.senderPhone === user?.phone
    );
    setTransactions(userTx);
  }, [user]);

  const filteredTx = transactions.filter(tx => {
    const matchDate = filter.date ? tx.timestamp?.slice(0, 10) === filter.date : true;
    const matchAmount = filter.amount ? tx.amount === filter.amount : true;
    const matchBeneficiary = filter.beneficiary ? tx.beneficiaryAccount?.includes(filter.beneficiary) : true;
    return matchDate && matchAmount && matchBeneficiary;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="w-full h-2 bg-purple-800"></div>
      <div className="p-4">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Transaction History</CardTitle>
            <div className="flex gap-2 mt-4">
              <Input type="date" value={filter.date} onChange={e => setFilter(f => ({ ...f, date: e.target.value }))} placeholder="Date" className="max-w-xs" />
              <Input type="text" value={filter.amount} onChange={e => setFilter(f => ({ ...f, amount: e.target.value }))} placeholder="Amount" className="max-w-xs" />
              <Input type="text" value={filter.beneficiary} onChange={e => setFilter(f => ({ ...f, beneficiary: e.target.value }))} placeholder="Beneficiary Account" className="max-w-xs" />
              <Button onClick={() => setFilter({ date: "", amount: "", beneficiary: "" })}>Clear</Button>
              <Link to="/transactions/new"><Button variant="default">New Transaction</Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {filteredTx.length === 0 ? (
              <div className="text-gray-500 text-center">No transactions found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTx.slice().reverse().map((tx, idx) => (
                    <TableRow key={tx.id || idx}>
                      <TableCell className="font-mono text-xs">{tx.timestamp}</TableCell>
                      <TableCell>₹{tx.amount}</TableCell>
                      <TableCell>{tx.channel}</TableCell>
                      <TableCell>{tx.beneficiaryAccount}</TableCell>
                      <TableCell>{tx.status || tx.final_decision || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions; 