import { useEffect, useState } from "react";
import { fetchProgressSummary, type ProgressSummary } from "@/lib/api";
import { StudyDNA } from "@/components/StudyDNA";

export function ProgressPage() {
  const [data, setData] = useState<ProgressSummary | null | "err">(null);

  useEffect(() => {
    void (async () => {
      const d = await fetchProgressSummary();
      setData(d ?? "err");
    })();
  }, []);

  if (data === null) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-violet-950/50" />
        <div className="h-40 rounded-2xl bg-violet-950/30" />
      </div>
    );
  }

  if (data === "err") {
    return (
      <p className="text-rose-400">Could not load stats. Is the API running?</p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
          Achievement board
        </h1>
        <p className="mt-1 text-sm text-violet-300/70">
          Your long-run performance and burnout trend.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-violet-400">Streak</p>
          <p className="mt-2 text-3xl font-bold text-orange-200">
            {data.streak.current}{" "}
            <span className="text-lg text-orange-400/60">/ {data.streak.longest} best</span>
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-amber-400">Rank</p>
          <p className="mt-2 text-3xl font-bold text-amber-100">{data.tier}</p>
          <p className="text-sm text-amber-200/80">{data.points} XP total</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-emerald-400">Tasks cleared</p>
          <p className="mt-2 text-3xl font-bold text-emerald-100">{data.todosCompleted}</p>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-cyan-400">Focus minutes</p>
          <p className="mt-2 text-3xl font-bold text-cyan-100">{data.focusMinutesTotal}</p>
        </div>
      </div>

      {data.dna ? (
        <StudyDNA dna={data.dna} />
      ) : null}

      {data.learnerSummary ? (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
            Learner profile
          </p>
          <p className="mt-2 text-sm leading-relaxed text-violet-100/90 whitespace-pre-wrap">
            {data.learnerSummary}
          </p>
        </div>
      ) : null}

      {data.lastBurnoutTip ? (
        <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-950/10 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300">
            Last coach tip
          </p>
          <p className="mt-2 text-sm text-fuchsia-100/90">{data.lastBurnoutTip}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-700/50 bg-black/30 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Burnout (7 days)
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {data.burnout.last7.map((b) => (
            <li key={b.date} className="flex justify-between text-zinc-300">
              <span>{b.date}</span>
              <span>
                {b.state} · {b.score}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
