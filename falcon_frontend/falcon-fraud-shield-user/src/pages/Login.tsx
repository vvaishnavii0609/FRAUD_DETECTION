import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Key, Smartphone } from "lucide-react";

export default function Login({ setUser }: { setUser?: (u: any) => void }) {
  const [step, setStep] = useState<"login" | "otp">("login");
  const [form, setForm] = useState({
    phoneOrAccount: "",
    password: ""
  });
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(
      (u: any) => u.phone === form.phoneOrAccount || u.account === form.phoneOrAccount
    );
    if (!user) {
      setError("User not found. Please check your phone/account number.");
      return;
    }
    // Generate OTP (mock: 6-digit random)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otpCode);
    setStep("otp");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp !== generatedOtp) {
      setError("Invalid OTP. Please try again.");
      return;
    }
    // Log in user
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find(
      (u: any) => u.phone === form.phoneOrAccount || u.account === form.phoneOrAccount
    );
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      if (setUser) setUser(user);
      navigate("/");
    } else {
      setError("User not found.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="flex flex-col items-center">
          <img src="/bank-logo.svg" alt="Bank Logo" className="h-12 w-12 mb-2" />
          <CardTitle className="text-2xl text-blue-800 text-center">Falcon Bank Login</CardTitle>
        </CardHeader>
        <CardContent>
          {step === "login" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <Label htmlFor="phoneOrAccount">Phone or Account Number</Label>
                <div className="relative">
                  <Input
                    id="phoneOrAccount"
                    name="phoneOrAccount"
                    type="text"
                    placeholder="Enter phone or account number"
                    value={form.phoneOrAccount}
                    onChange={handleChange}
                    required
                    className="mt-1 pl-10"
                  />
                  <Smartphone className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 text-lg">Send OTP</Button>
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </form>
          )}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <div className="relative">
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter the OTP sent to your phone"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                    className="mt-1 pl-10"
                  />
                  <Key className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
                </div>
                <div className="text-xs text-blue-600 mt-1">(Demo: Your OTP is <span className="font-mono">{generatedOtp}</span>)</div>
              </div>
              <Button type="submit" className="w-full h-12 text-lg">Verify OTP & Login</Button>
              {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 