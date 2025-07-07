import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [form, setForm] = useState({
    phoneOrAccount: "",
    password: ""
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Get users from localStorage (mock DB)
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    // Ensure admin user exists
    const adminUser = {
      id: 0,
      phone: "9998887777",
      account: "9876543211",
      password: "adminpass",
      name: "Admin User",
      role: "admin"
    };
    if (!users.some((u: any) => u.role === "admin")) {
      users.push(adminUser);
      localStorage.setItem("users", JSON.stringify(users));
    }
    const user = users.find(
      (u: any) =>
        (u.phone === form.phoneOrAccount || u.account === form.phoneOrAccount) &&
        u.password === form.password
    );
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="phoneOrAccount">Phone or Account Number</Label>
              <Input
                id="phoneOrAccount"
                name="phoneOrAccount"
                type="text"
                placeholder="Enter phone or account number"
                value={form.phoneOrAccount}
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
                placeholder="Enter password"
                value={form.password}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <Button type="submit" className="w-full h-12 text-lg">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 