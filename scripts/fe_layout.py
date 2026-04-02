import pathlib
root = pathlib.Path(r"e:/StudySync/frontend/src")

(root / "layout/RequireAuth.tsx").write_text(r"""
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
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
""".strip() + "\n", encoding="utf-8")

(root / "components/RewardOverlay.tsx").write_text(r"""
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useRewards } from "@/context/RewardContext";

export function RewardOverlay() {
  const { queue, dismiss } = useRewards();
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => dismiss(), 4200);
    return () => window.clearTimeout(t);
  }, [current, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-[100] flex justify-center px-4">
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.title + (current.subtitle ?? "")}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className={`pointer-events-auto max-w-md rounded-2xl border px-6 py-4 shadow-2xl ${
              current.tierUp
                ? "border-amber-400/60 bg-gradient-to-br from-amber-950/95 to-violet-950/95 text-amber-100"
                : "border-violet-500/40 bg-zinc-950/95 text-violet-50"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/90">
              Loot drop
            </p>
            <p className="mt-1 text-lg font-bold tracking-tight">{current.title}</p>
            {current.subtitle ? (
              <p className="mt-1 text-sm text-violet-200/90">{current.subtitle}</p>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss()}
              className="mt-3 text-xs text-violet-400 underline-offset-2 hover:underline"
            >
              Nice!
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
""".strip() + "\n", encoding="utf-8")

(root / "components/GameHUD.tsx").write_text(r"""
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGamificationState, type GamificationState } from "@/lib/api";

export function GameHUD() {
  const [g, setG] = useState<GamificationState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchGamificationState();
      if (!cancelled) setG(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!g) {
    return (
      <header className="border-b border-violet-500/20 bg-[#0c0518]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold text-violet-200">StudySync</span>
          <div className="h-8 w-40 animate-pulse rounded-lg bg-violet-900/40" />
        </div>
      </header>
    );
  }

  const burn =
    g.burnout.state === "green"
      ? "from-emerald-400 to-emerald-600"
      : g.burnout.state === "yellow"
        ? "from-amber-400 to-amber-600"
        : g.burnout.state === "red"
          ? "from-rose-400 to-rose-600"
          : "from-zinc-500 to-zinc-600";

  return (
    <header className="sticky top-0 z-50 border-b border-violet-500/25 bg-[#0c0518]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="text-sm font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
          StudySync
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <div className="rounded-xl border border-orange-500/30 bg-orange-950/50 px-3 py-1.5 text-orange-100">
            <span className="text-orange-300/80">Streak </span>
            <span className="font-mono font-bold">{g.streak.current}</span>
            <span className="text-orange-400/60"> / {g.streak.longest}</span>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-amber-100">
            <span className="text-amber-200/80">{g.tier}</span>
            <span className="ml-2 font-mono text-amber-50">{g.points} XP</span>
          </div>
          <div className="hidden min-w-[120px] sm:block">
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-violet-300/70">
              <span>Energy</span>
              <span>{g.energyPercent}%</span>
            </div>
            <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${burn}`}
                style={{ width: `${g.energyPercent}%` }}
              />
            </div>
          </div>
          <Link
            to="/progress"
            className="rounded-lg border border-violet-500/40 px-2 py-1 text-violet-200 hover:bg-violet-950/60"
          >
            Stats
          </Link>
        </div>
      </div>
    </header>
  );
}
""".strip() + "\n", encoding="utf-8")

(root / "layout/GameShellLayout.tsx").write_text(r"""
import { Outlet } from "react-router-dom";
import { GameHUD } from "@/components/GameHUD";
import { RewardOverlay } from "@/components/RewardOverlay";

export function GameShellLayout() {
  return (
    <div className="min-h-screen bg-[#0c0518] text-zinc-100">
      <GameHUD />
      <RewardOverlay />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
""".strip() + "\n", encoding="utf-8")

print("layout components ok")
