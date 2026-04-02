import { useEffect, useState } from "react";
import {
  fetchWellbeingHistory,
  fetchWellbeingIntervention,
  recalculateWellbeing,
  type BurnoutPoint,
} from "@/lib/api";
import { useHud } from "@/context/HudContext";

function Sparkline({ points }: { points: BurnoutPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="text-xs text-violet-400/70">
        No burnout history yet — check back after a few study days.
      </p>
    );
  }
  const w = 280;
  const h = 64;
  const pad = 4;
  const scores = points.map((p) => p.score);
  const min = Math.min(...scores, 0);
  const max = Math.max(...scores, 100);
  const span = max - min || 1;
  const step = (w - pad * 2) / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = pad + i * step;
      const y = pad + (1 - (p.score - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      className="text-violet-300"
      aria-label="Burnout trend last 7 days"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BurnoutPanel() {
  const { refresh } = useHud();
  const [level, setLevel] = useState<string>("unknown");
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState<BurnoutPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await recalculateWellbeing();
      } catch {
        /* offline / 503 */
      }
      if (cancelled) return;
      try {
        const [iv, hist] = await Promise.all([
          fetchWellbeingIntervention(),
          fetchWellbeingHistory(7),
        ]);
        if (cancelled) return;
        setLevel(iv.level);
        setMessage(iv.message);
        setPoints(hist);
        void refresh();
      } catch {
        if (!cancelled) setPoints([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const bannerClass =
    level === "red"
      ? "bg-rose-950/60 border-rose-500/40 text-rose-100"
      : level === "yellow"
        ? "bg-amber-950/50 border-amber-500/40 text-amber-100"
        : level === "green"
          ? "bg-emerald-950/40 border-emerald-500/35 text-emerald-100"
          : "bg-zinc-900/60 border-zinc-600 text-zinc-300";

  if (loading) {
    return (
      <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/50 p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-violet-900/40" />
        <div className="mt-4 h-16 w-full animate-pulse rounded-xl bg-violet-950/30" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-zinc-950/60 p-5 shadow-inner">
      <h2 className="text-sm font-semibold text-violet-100">Burnout &amp; rhythm</h2>
      {message && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${bannerClass}`}>
          {message}
        </div>
      )}
      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-violet-400/80">
          Last 7 days (score)
        </p>
        <div className="mt-2 flex justify-center">
          <Sparkline points={points} />
        </div>
      </div>
    </div>
  );
}
