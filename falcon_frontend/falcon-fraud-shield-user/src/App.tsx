import { useEffect, useState, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Transactions from "./pages/transactions";
import TransactionsNew from "./pages/transactions_new";
import Profile from "./pages/Profile";

const queryClient = new QueryClient();

// Auth context for login state
const AuthContext = createContext<{ user: any, setUser: (u: any) => void }>({ user: null, setUser: () => {} });

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem("user") || "null"));
  useEffect(() => {
    localStorage.setItem("user", user ? JSON.stringify(user) : "null");
  }, [user]);
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Remove NavBar component and all references to Falcon Bank, logo, and Logout button.
// Only render navigation and Logout on protected pages (e.g., inside Index or a dedicated layout component if needed).
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginWithAuth />} />
            <Route path="/login" element={<LoginWithAuth />} />
            <Route path="/signup" element={<SignupWithAuth />} />
            <Route path="/main" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/transactions/new" element={<ProtectedRoute><TransactionsNew /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

// Wrap Login and Signup to update auth context on login/signup
function LoginWithAuth() {
  const { setUser } = useAuth();
  return <Login setUser={setUser} />;
}
function SignupWithAuth() {
  const { setUser } = useAuth();
  return <Signup setUser={setUser} />;
}

export default App;
