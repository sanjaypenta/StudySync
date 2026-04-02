import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav("/", { replace: true });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0518] px-4">
      <div className="w-full max-w-md rounded-3xl border border-violet-500/30 bg-zinc-950/80 p-8 shadow-2xl shadow-violet-950/50">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-violet-200/70">Sign in to continue your run.</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs font-medium text-violet-300/80">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-violet-300/80">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {err ? <p className="text-sm text-rose-400">{err}</p> : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95"
          >
            Enter game
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-violet-400/80">
          No account?{" "}
          <Link className="text-fuchsia-300 hover:underline" to="/register">
            Register
          </Link>
        </p>
        <p className="mt-4 text-center text-[10px] text-zinc-500">
          Forgot password? Contact your admin — reset coming in a later version.
        </p>
      </div>
    </div>
  );
}
