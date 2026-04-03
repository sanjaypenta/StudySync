import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0518] text-violet-200 text-sm">
        Loading your quest log…
      </div>
    );
  }
  if (!user) return <Navigate to="/welcome" replace />;
  return <Outlet />;
}
