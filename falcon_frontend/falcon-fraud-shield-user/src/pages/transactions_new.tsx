import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Header from "@/components/Header";

const TransactionsNew = () => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
    toast("Transaction submitted successfully!");
    setTimeout(() => navigate("/transactions"), 1200);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Transaction Submitted</h2>
            <p className="text-gray-600 mb-6">Your transaction is being processed and will be reviewed shortly.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
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
                <select
                  id="channel"
                  value={formData.channel}
                  onChange={e => handleInputChange('channel', e.target.value)}
                  required
                  className="mt-1 w-full border rounded px-3 py-2"
                >
                  <option value="">Select channel</option>
                  <option value="NEFT">NEFT</option>
                  <option value="UPI">UPI</option>
                  <option value="RTGS">RTGS</option>
                  <option value="IMPS">IMPS</option>
                </select>
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
      </main>
    </div>
  );
};

export default TransactionsNew; 