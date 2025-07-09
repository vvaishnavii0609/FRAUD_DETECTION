import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Key, Smartphone } from "lucide-react";
import { generateOTP, verifyOTP } from "@/utils/api";
import { toast } from "sonner";

export default function Login({ setUser }: { setUser?: (u: any) => void }) {
  const [step, setStep] = useState<"login" | "otp">("login");
  const [form, setForm] = useState({
    phoneOrAccount: "",
    password: ""
  });
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const response = await generateOTP(form.phoneOrAccount);
      setUserId(response.user_id);
      setStep("otp");
      toast.success("OTP sent successfully! Check console for OTP.");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      const response = await verifyOTP(userId!, otp);
      const user = {
        id: response.id,
        name: response.name,
        phone: response.phone,
        account: response.phone // Using phone as account number for demo
      };
      
      localStorage.setItem("user", JSON.stringify(user));
      if (setUser) setUser(user);
      toast.success("Login successful!");
      navigate("/main");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-900">
            {step === "login" ? "Login to Detectorr" : "Enter OTP"}
          </CardTitle>
          <p className="text-gray-600">
            {step === "login" 
              ? "Enter your phone number to receive OTP" 
              : "Enter the 6-digit OTP sent to your phone"
            }
          </p>
        </CardHeader>
        <CardContent>
          {step === "login" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="phoneOrAccount">Phone Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phoneOrAccount"
                    name="phoneOrAccount"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={form.phoneOrAccount}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
              
              {/* Add signup link */}
              <div className="text-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/signup")}
                >
                  Don't have an account? Sign Up
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="otp">OTP Code</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10"
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setStep("login")}
              >
                Back to Login
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 