import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, CreditCard, ArrowRight, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('transactions') || '[]');
    setHistory(existing);
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
    const transaction = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    existingTransactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(existingTransactions));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setHistory(existingTransactions);
    toast("Transaction submitted successfully!");
  };

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">Falcon Fraud</span>
            </div>
            <Link to="/admin">
              <Button variant="outline" size="sm">
                Admin Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <CreditCard className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Secure Transaction Portal</h1>
          <p className="text-xl text-gray-600">Protected by AI-powered fraud detection</p>
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
          {history.length === 0 ? (
            <div className="text-gray-500">No transactions submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded shadow">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Date/Time</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Channel</th>
                    <th className="px-4 py-2">Beneficiary</th>
                    <th className="px-4 py-2">Risk</th>
                    <th className="px-4 py-2">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice().reverse().map((tx, idx) => (
                    <tr key={tx.id || idx} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">{tx.date || tx.timestamp}</td>
                      <td className="px-4 py-2">₹{tx.amount}</td>
                      <td className="px-4 py-2">{tx.channel}</td>
                      <td className="px-4 py-2">{tx.beneficiaryAccount}</td>
                      <td className="px-4 py-2">{tx.risk_level || '-'}</td>
                      <td className="px-4 py-2">{tx.final_decision || '-'}</td>
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
