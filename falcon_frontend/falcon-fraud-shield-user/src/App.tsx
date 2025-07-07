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

function NavBar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    setUser(null);
    navigate("/login");
  };
  return (
    <nav className="bg-white shadow-sm border-b mb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-14">
        <span className="text-xl font-bold text-blue-800 flex items-center gap-2">
          <img src="/bank-logo.svg" alt="Bank Logo" className="h-7 w-7" />
          Falcon Bank
        </span>
        <div className="space-x-2">
          {!user && <Button variant="outline" size="sm" onClick={() => navigate("/login")}>Login</Button>}
          {!user && <Button variant="outline" size="sm" onClick={() => navigate("/signup")}>Sign Up</Button>}
          {user && <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>}
        </div>
      </div>
    </nav>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/login" element={<LoginWithAuth />} />
            <Route path="/signup" element={<SignupWithAuth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
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
