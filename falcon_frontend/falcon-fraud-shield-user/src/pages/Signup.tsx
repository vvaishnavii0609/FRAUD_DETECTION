import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Signup({ setUser }: { setUser?: (u: any) => void }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    account: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Get users from localStorage (mock DB)
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    // Check for existing phone or account
    if (users.some((u: any) => u.phone === form.phone || u.account === form.account)) {
      setError("Phone or account number already registered.");
      return;
    }
    // Save new user
    const newUser = { ...form, role: "user" };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    setSuccess(true);
    // Optionally auto-login after signup:
    // if (setUser) setUser(newUser);
    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          {/* Button group for Login/Sign Up navigation */}
          <div className="flex mb-4 gap-2">
            <Button
              variant="outline"
              className="w-1/2"
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
            <Button
              variant="default"
              className="w-1/2 bg-blue-700 text-white cursor-default"
              disabled
            >
              Sign Up
            </Button>
          </div>
          <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your name"
                value={form.name}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="text"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="account">Account Number</Label>
              <Input
                id="account"
                name="account"
                type="text"
                placeholder="Enter account number"
                value={form.account}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Set a password"
                value={form.password}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">Signup successful! Redirecting to login...</div>}
            <Button type="submit" className="w-full h-12 text-lg">Sign Up</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 