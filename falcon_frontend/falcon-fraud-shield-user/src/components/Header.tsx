import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navLinkClass = (isActive: boolean) =>
  `pb-1 ${isActive ? "border-b-2 border-blue-600 font-bold" : "hover:border-b-2 hover:border-blue-400"}`;

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };
  return (
    <header className="bg-white shadow-sm border-b flex items-center px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#fff" />
            <circle cx="12" cy="12" r="6" fill="#2563eb" />
          </svg>
        </div>
        <span className="text-2xl font-bold text-blue-900 tracking-wide">Detectorr</span>
      </div>
      <nav className="ml-10 flex gap-6 text-blue-700 text-lg font-medium">
        <Link to="/main" className={navLinkClass(location.pathname === "/main")}>Home</Link>
        <Link to="/transactions" className={navLinkClass(location.pathname.startsWith("/transactions"))}>Transactions</Link>
        <Link to="/profile" className={navLinkClass(location.pathname === "/profile")}>Profile</Link>
      </nav>
      <div className="flex-1"></div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Logout
      </Button>
    </header>
  );
};

export default Header; 