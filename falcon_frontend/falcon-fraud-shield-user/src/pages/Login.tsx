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
      navigate("/main");
    } else {
      setError("User not found.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="flex flex-col items-center">
          {/* Button group for Login/Sign Up navigation */}
          <div className="flex mb-4 gap-2 w-full">
            <Button
              variant="default"
              className="w-1/2 bg-blue-700 text-white cursor-default"
              disabled
            >
              Login
            </Button>
            <Button
              variant="outline"
              className="w-1/2"
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </Button>
          </div>
          {/* Detectorr SVG Logo */}
          <span className="mb-2">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" fill="#2563eb" stroke="#fff" strokeWidth="4" />
              <path d="M24 14a8 8 0 018 8c0 6-8 12-8 12s-8-6-8-12a8 8 0 018-8z" fill="#fff" />
              <circle cx="24" cy="22" r="3" fill="#2563eb" />
            </svg>
          </span>
          <CardTitle className="text-2xl text-blue-800 text-center">Detectorr Login</CardTitle>
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
          {/* Sign Up Button below login form */}
          {step === "login" && (
            <div className="mt-4 text-center">
              <Button variant="outline" className="w-full" onClick={() => navigate("/signup")}>Sign Up</Button>
            </div>
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
              {/* Back to Login link */}
              <div className="mt-4 text-center">
                <button type="button" className="text-blue-700 underline" onClick={() => setStep("login")}>Back to Login</button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 