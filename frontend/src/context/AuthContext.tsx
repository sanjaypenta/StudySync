import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { clearToken, getToken, setToken } from "@/lib/authStorage";

export type AuthUser = { id: string; email: string; displayName: string };

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const C = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const r = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) {
        clearToken();
        setUser(null);
        return;
      }
      const d = (await r.json()) as { user: AuthUser };
      setUser(d.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const raw = await r.text();
    let err = "Login failed";
    try {
      const j = JSON.parse(raw) as { error?: string };
      if (j.error) err = j.error;
    } catch {
      /* ignore */
    }
    if (!r.ok) throw new Error(err);
    const d = JSON.parse(raw) as { token: string; user: AuthUser };
    setToken(d.token);
    setUser(d.user);
  };

  const register = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
    const raw = await r.text();
    let err = "Registration failed";
    try {
      const j = JSON.parse(raw) as { error?: string };
      if (j.error) err = j.error;
    } catch {
      /* ignore */
    }
    if (!r.ok) throw new Error(err);
    const d = JSON.parse(raw) as { token: string; user: AuthUser };
    setToken(d.token);
    setUser(d.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <C.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </C.Provider>
  );
}

export function useAuth() {
  const v = useContext(C);
  if (!v) throw new Error("useAuth requires AuthProvider");
  return v;
}
