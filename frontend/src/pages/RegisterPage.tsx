import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    try {
      await register(email, password, displayName || undefined);
      nav("/onboarding", { replace: true });
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Registration failed");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0518] px-4">
      <div className="w-full max-w-md rounded-3xl border border-fuchsia-500/30 bg-zinc-950/80 p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-violet-300">
          New player
        </h1>
        <p className="mt-2 text-sm text-violet-200/70">Create an account to save streaks & XP.</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs font-medium text-violet-300/80">Display name (optional)</label>
            <input
              className="mt-1 w-full rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-violet-300/80">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-violet-300/80">Password (8+ chars)</label>
            <input
              className="mt-1 w-full rounded-xl border border-violet-500/25 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          {err ? <p className="text-sm text-rose-400">{err}</p> : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            Start adventure
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-violet-400/80">
          Have an account?{" "}
          <Link className="text-violet-300 hover:underline" to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
