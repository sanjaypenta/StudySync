import { useEffect, useMemo, useState } from "react";
import { fetchBurnoutPredictionSummary, type BurnoutPredictionSummary } from "@/lib/api";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function colorFor(level: BurnoutPredictionSummary["risk"]["level"]) {
  if (level === "high") return "rose";
  if (level === "moderate") return "amber";
  return "emerald";
}

function trendGlyph(state: BurnoutPredictionSummary["trend"]["state"]) {
  if (state === "increasing") return "↗";
  if (state === "decreasing") return "↘";
  return "→";
}

export function BurnoutPredictionPanel() {
  const [data, setData] = useState<BurnoutPredictionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetchBurnoutPredictionSummary();
        if (!alive) return;
        setData(r);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Could not load burnout prediction");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    const id = window.setInterval(() => void load(), 30_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const score01 = clamp01(data?.risk.score01 ?? 0);
  const pct = Math.round(score01 * 100);
  const level = data?.risk.level ?? "low";
  const tone = colorFor(level);

  const meterClass = useMemo(() => {
    if (tone === "rose") return "from-rose-500 to-rose-400";
    if (tone === "amber") return "from-amber-500 to-amber-400";
    return "from-emerald-500 to-emerald-400";
  }, [tone]);

  const frameClass = useMemo(() => {
    if (tone === "rose") return "border-rose-500/35 bg-rose-950/20";
    if (tone === "amber") return "border-amber-500/35 bg-amber-950/20";
    return "border-emerald-500/35 bg-emerald-950/20";
  }, [tone]);

  return (
    <div className={`rounded-2xl border p-4 ${frameClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">
            Burnout prediction
          </p>
          <p className="mt-1 text-lg font-bold text-white">{data?.risk.label ?? "—"}</p>
          <p className="mt-1 text-sm text-violet-200/75">
            {data?.timeToBurnout.message ?? "Learning your rhythm — predictions get sharper over time."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-violet-200/60">Risk</p>
          <p className="text-2xl font-extrabold text-white">{pct}%</p>
          <p className="text-xs text-violet-200/60">
            {data ? `${trendGlyph(data.trend.state)} ${data.trend.message}` : ""}
          </p>
          {data?.risk.confidence && (
            <p className="mt-1 text-[11px] text-violet-200/50">Confidence: {data.risk.confidence}</p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full rounded-full bg-black/25">
          <div
            className={`h-2 rounded-full bg-gradient-to-r ${meterClass}`}
            style={{ width: `${pct}%` }}
            aria-label="Burnout risk meter"
          />
        </div>
      </div>

      {loading && (
        <div className="mt-3 h-10 animate-pulse rounded-xl bg-violet-950/30" />
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          {error}
        </p>
      )}

      {!loading && data && data.adjustment.applied && (
        <p className="mt-3 rounded-xl border border-cyan-500/35 bg-cyan-950/25 px-3 py-2 text-sm text-cyan-100">
          {data.adjustment.message}
          {data.adjustment.moved > 0 ? ` (Moved ${data.adjustment.moved} task${data.adjustment.moved === 1 ? "" : "s"}.)` : ""}
        </p>
      )}

      {!loading && data && data.warnings?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/70">
            Heads-up
          </p>
          <div className="mt-2 space-y-2">
            {data.warnings.slice(0, 3).map((w, i) => (
              <p
                key={i}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-violet-100/90"
              >
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {!loading && data && data.tips?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/70">
            Suggestions
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.tips.slice(0, 3).map((t, i) => (
              <span
                key={i}
                className="rounded-full border border-violet-500/25 bg-violet-950/30 px-3 py-1 text-xs text-violet-100/80"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
