import { useState } from "react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Profile = () => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [pw, setPw] = useState({ old: "", new1: "", new2: "" });
  const [pwError, setPwError] = useState("");

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = () => {
    const updatedUser = { ...user, ...form };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    // Also update in users array
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const idx = users.findIndex((u: any) => u.account === user.account);
    if (idx !== -1) {
      users[idx] = updatedUser;
      localStorage.setItem("users", JSON.stringify(users));
    }
    setEdit(false);
    toast("Profile updated");
  };

  const handlePwChange = () => {
    setPwError("");
    if (pw.new1 !== pw.new2) {
      setPwError("New passwords do not match");
      return;
    }
    if (pw.old !== user.password) {
      setPwError("Old password is incorrect");
      return;
    }
    const updatedUser = { ...user, password: pw.new1 };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    // Also update in users array
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const idx = users.findIndex((u: any) => u.account === user.account);
    if (idx !== -1) {
      users[idx] = updatedUser;
      localStorage.setItem("users", JSON.stringify(users));
    }
    setPw({ old: "", new1: "", new2: "" });
    toast("Password changed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="w-full h-2 bg-purple-800"></div>
      <main className="max-w-xl mx-auto px-4 py-12">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleInfoChange}
                  disabled={!edit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="text"
                  value={form.phone}
                  onChange={handleInfoChange}
                  disabled={!edit}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="account">Account Number</Label>
                <Input
                  id="account"
                  name="account"
                  type="text"
                  value={user.account}
                  disabled
                  className="mt-1"
                />
              </div>
              {edit ? (
                <Button className="w-full" onClick={handleSaveInfo}>Save</Button>
              ) : (
                <Button className="w-full" onClick={() => setEdit(true)}>Edit</Button>
              )}
            </div>
            <hr className="my-8" />
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-2">Change Password</h2>
              <div>
                <Label htmlFor="old">Old Password</Label>
                <Input
                  id="old"
                  name="old"
                  type="password"
                  value={pw.old}
                  onChange={e => setPw({ ...pw, old: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new1">New Password</Label>
                <Input
                  id="new1"
                  name="new1"
                  type="password"
                  value={pw.new1}
                  onChange={e => setPw({ ...pw, new1: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new2">Confirm New Password</Label>
                <Input
                  id="new2"
                  name="new2"
                  type="password"
                  value={pw.new2}
                  onChange={e => setPw({ ...pw, new2: e.target.value })}
                  className="mt-1"
                />
              </div>
              {pwError && <div className="text-red-500 text-sm">{pwError}</div>}
              <Button className="w-full" onClick={handlePwChange}>Change Password</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile; 