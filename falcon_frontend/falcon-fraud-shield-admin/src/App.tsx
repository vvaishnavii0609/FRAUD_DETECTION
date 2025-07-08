import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, List, Settings as SettingsIcon, LayoutDashboard } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return children;
}

function Sidebar() {
  const location = useLocation();
  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
    { to: "/analytics", label: "Analytics", icon: <TrendingUp className="h-5 w-5" /> },
    { to: "/transactions", label: "Transactions", icon: <List className="h-5 w-5" /> },
    { to: "/settings", label: "Settings", icon: <SettingsIcon className="h-5 w-5" /> },
  ];
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r shadow-sm py-6 px-2">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Shield className="h-7 w-7 text-blue-600" />
        <span className="text-xl font-bold text-gray-900">Falcon Admin</span>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-base font-medium transition-colors ${location.pathname === item.to ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
