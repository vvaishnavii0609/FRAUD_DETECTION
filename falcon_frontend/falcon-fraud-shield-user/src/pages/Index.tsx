import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CreditCard, ArrowRight, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function exportToCSV(transactions: any[], filename: string) {
  const csvRows = [
    ["Date/Time", "Amount", "Channel", "Beneficiary Account", "IFSC Code"],
    ...transactions.map(tx => [
      tx.timestamp,
      tx.amount,
      tx.channel,
      tx.beneficiaryAccount,
      tx.ifsc
    ])
  ];
  const csvContent = csvRows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Index = () => {
  const [formData, setFormData] = useState({
    amount: "",
    channel: "",
    senderPhone: "",
    senderAccount: "",
    beneficiaryAccount: "",
    ifsc: "",
    description: ""
  });
  const [errors, setErrors] = useState<any>({});
  const [response, setResponse] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [filter, setFilter] = useState({
    date: "",
    amount: "",
    beneficiary: ""
  });
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    setUser(u);
    const allTx = JSON.parse(localStorage.getItem("transactions") || "[]");
    // Filter transactions for this user (by account or phone)
    const userTx = allTx.filter((tx: any) =>
      tx.senderAccount === u?.account || tx.senderPhone === u?.phone
    );
    setHistory(userTx);
  }, [isSubmitted]);

  const validate = () => {
    const errs: any = {};
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) errs.amount = "Enter a valid amount";
    if (!formData.channel) errs.channel = "Select a channel";
    if (!formData.senderPhone || !/^\d{10}$/.test(formData.senderPhone)) errs.senderPhone = "Enter a valid 10-digit phone number";
    if (!formData.senderAccount || !/^\d{6,18}$/.test(formData.senderAccount)) errs.senderAccount = "Enter a valid account number";
    if (!formData.beneficiaryAccount || !/^\d{6,18}$/.test(formData.beneficiaryAccount)) errs.beneficiaryAccount = "Enter a valid account number";
    if (!formData.ifsc || !/^[A-Za-z]{4}\d{7}$/.test(formData.ifsc)) errs.ifsc = "Enter a valid IFSC code (e.g., HDFC0001234)";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Attach user info to transaction
    const u = JSON.parse(localStorage.getItem("user") || "null");
    const transaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      senderAccount: u?.account,
      senderPhone: u?.phone,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    existingTransactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(existingTransactions));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setHistory(existingTransactions.filter((tx: any) => tx.senderAccount === u?.account || tx.senderPhone === u?.phone));
    toast("Transaction submitted successfully!");
  };

  // Filtering logic
  const filteredHistory = history.filter(tx => {
    const matchDate = filter.date ? tx.timestamp?.slice(0, 10) === filter.date : true;
    const matchAmount = filter.amount ? tx.amount === filter.amount : true;
    const matchBeneficiary = filter.beneficiary ? tx.beneficiaryAccount?.includes(filter.beneficiary) : true;
    return matchDate && matchAmount && matchBeneficiary;
  });

  // Spending insights (total spent, monthly breakdown)
  const totalSpent = history.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const monthlySpent: { [month: string]: number } = {};
  history.forEach(tx => {
    const month = tx.timestamp?.slice(0, 7) || "";
    if (!monthlySpent[month]) monthlySpent[month] = 0;
    monthlySpent[month] += Number(tx.amount || 0);
  });

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Transaction Submitted</h2>
            <p className="text-gray-600 mb-6">Your transaction is being processed and will be reviewed shortly.</p>
            <Button onClick={() => { setIsSubmitted(false); }} className="w-full">
              Submit Another Transaction
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        
      
              {/* <span className="text-2xl font-bold text-gray-900">Falcon Fraud</span> */}
            
            {/* <Link to="/login">
              <Button variant="outline" size="sm">Logout</Button>
            </Link> */}
          
        
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <CreditCard className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Secure Transaction Portal</h1>
          <p className="text-xl text-gray-600">Protected by AI-powered fraud detection</p>
        </div>

        {/* Personalized greeting and account summary */}
        {user && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Welcome, {user.name}!</h2>
            <div className="text-gray-600 mb-2">Account: {user.account}</div>
            <div className="text-gray-600 mb-2">Total Spent: ₹{totalSpent}</div>
          </div>
        )}
        {/* Spending insights (simple monthly breakdown) */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Spending Insights</h3>
          <ul className="text-gray-700 text-sm">
            {Object.entries(monthlySpent).map(([month, amt]) => (
              <li key={month}>{month}: ₹{amt}</li>
            ))}
          </ul>
        </div>
        {/* Transaction filters */}
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
          <Button onClick={() => exportToCSV(filteredHistory, "transactions.csv")}>Export CSV</Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Submit Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="amount">Transaction Amount (₹)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Enter the amount to transfer (must be positive)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  required
                  className="mt-1"
                />
                {errors.amount && <div className="text-red-500 text-sm">{errors.amount}</div>}
              </div>

              <div>
                <Label htmlFor="channel">Transaction Channel</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Select NEFT, UPI, RTGS, or IMPS</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Select value={formData.channel} onValueChange={(value) => handleInputChange('channel', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="IMPS">IMPS</SelectItem>
                  </SelectContent>
                </Select>
                {errors.channel && <div className="text-red-500 text-sm">{errors.channel}</div>}
              </div>

              <div>
                <Label htmlFor="senderPhone">Sender Phone Number</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Enter your 10-digit phone number</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="senderPhone"
                  type="text"
                  placeholder="Enter phone number"
                  value={formData.senderPhone}
                  onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                  required
                  className="mt-1"
                />
                {errors.senderPhone && <div className="text-red-500 text-sm">{errors.senderPhone}</div>}
              </div>

              <div>
                <Label htmlFor="senderAccount">Sender Account Number</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Enter your bank account number</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="senderAccount"
                  type="text"
                  placeholder="Enter your account number"
                  value={formData.senderAccount}
                  onChange={(e) => handleInputChange('senderAccount', e.target.value)}
                  required
                  className="mt-1"
                />
                {errors.senderAccount && <div className="text-red-500 text-sm">{errors.senderAccount}</div>}
              </div>

              <div>
                <Label htmlFor="beneficiaryAccount">Beneficiary Account Number</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Enter the recipient's account number</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="beneficiaryAccount"
                  type="text"
                  placeholder="Enter beneficiary account number"
                  value={formData.beneficiaryAccount}
                  onChange={(e) => handleInputChange('beneficiaryAccount', e.target.value)}
                  required
                  className="mt-1"
                />
                {errors.beneficiaryAccount && <div className="text-red-500 text-sm">{errors.beneficiaryAccount}</div>}
              </div>

              <div>
                <Label htmlFor="ifsc">IFSC Code</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Enter the 11-character IFSC code</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="ifsc"
                  type="text"
                  placeholder="Enter IFSC code"
                  value={formData.ifsc}
                  onChange={(e) => handleInputChange('ifsc', e.target.value)}
                  required
                  className="mt-1"
                />
                {errors.ifsc && <div className="text-red-500 text-sm">{errors.ifsc}</div>}
              </div>

              <div>
                <Label htmlFor="description">Description/Remarks (optional)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="inline ml-1 h-4 w-4 text-gray-400 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>Optional: Add a note for this transaction</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Input
                  id="description"
                  type="text"
                  placeholder="Add a note (optional)"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    Submit Transaction
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>
          {filteredHistory.length === 0 ? (
            <div className="text-gray-500">No transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded shadow">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Date/Time</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Channel</th>
                    <th className="px-4 py-2">Beneficiary</th>
                    <th className="px-4 py-2">IFSC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.slice().reverse().map((tx, idx) => (
                    <tr key={tx.id || idx} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{tx.timestamp}</td>
                      <td className="px-4 py-2">₹{tx.amount}</td>
                      <td className="px-4 py-2">{tx.channel}</td>
                      <td className="px-4 py-2">{tx.beneficiaryAccount}</td>
                      <td className="px-4 py-2">{tx.ifsc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
