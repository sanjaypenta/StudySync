import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchStudyDnaSummary, type StudyDnaSummary } from "@/lib/api";

const strengthTones = {
  strong: {
    label: "Strong",
    text: "text-emerald-100",
    chip: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
    bar: "bg-emerald-500/80",
  },
  steady: {
    label: "Steady",
    text: "text-amber-100",
    chip: "bg-amber-500/15 text-amber-200 border-amber-500/40",
    bar: "bg-amber-400/80",
  },
  needs: {
    label: "Needs attention",
    text: "text-rose-100",
    chip: "bg-rose-500/15 text-rose-200 border-rose-500/40",
    bar: "bg-rose-400/80",
  },
} as const;

const dnaSignals = [
  "Study sessions",
  "Task completion",
  "Time of day",
  "Energy levels",
  "Burnout trend",
  "Subject mix",
];

const dnaFlow = [
  "Collect signals from your study activity",
  "Spot patterns in time, focus, and fatigue",
  "Turn patterns into a living Study DNA profile",
  "Nudge your plan with smart, human tips",
];

function EnergySparkline({ points }: { points: number[] }) {
  if (points.length === 0) {
    return (
      <p className="mt-3 text-xs text-cyan-100/70">
        Keep logging sessions to reveal your energy curve.
      </p>
    );
  }
  const max = Math.max(...points, 1);
  return (
    <div className="mt-3 flex items-end gap-1">
      {points.map((p, i) => (
        <div
          key={`${p}-${i}`}
          className="w-6 rounded-full bg-gradient-to-t from-cyan-500/80 to-emerald-400/80"
          style={{ height: `${Math.round((p / max) * 56) + 10}px` }}
        />
      ))}
    </div>
  );
}

export function StudyDnaPage() {
  const [data, setData] = useState<StudyDnaSummary | null | "err">(null);

  const focusDurationMinutes = data && data !== "err" ? data.focusDurationMinutes : 0;
  const idealSession = useMemo(() => {
    const rounded = Math.round(focusDurationMinutes / 5) * 5;
    return Math.max(25, rounded);
  }, [focusDurationMinutes]);

  useEffect(() => {
    let active = true;
    let id: number | undefined;

    async function load() {
      try {
        const summary = await fetchStudyDnaSummary();
        if (active) setData(summary);
      } catch {
        if (active) setData("err");
      }
    }

    void load();
    id = window.setInterval(() => void load(), 30000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      if (id) window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (data === null) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-cyan-950/50" />
        <div className="h-40 rounded-2xl bg-cyan-950/30" />
        <div className="h-40 rounded-2xl bg-cyan-950/30" />
      </div>
    );
  }

  if (data === "err") {
    return (
      <p className="text-rose-400">
        Could not load Study DNA yet. Is the API running?
      </p>
    );
  }

  const profile = data;

  const isLearning = profile.status === "learning" || profile.confidence < 0.45;
  const burnoutTone =
    profile.burnoutPattern.risk === "green"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
      : profile.burnoutPattern.risk === "yellow"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
        : "border-rose-500/40 bg-rose-500/10 text-rose-100";

  return (
    <div className="relative space-y-8" style={{ fontFamily: "Space Grotesk, Sora, Manrope, sans-serif" }}>
      <div className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-500/20 via-emerald-400/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute left-[-10%] top-40 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-500/20 via-rose-400/15 to-transparent blur-3xl" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Study DNA</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Your Study DNA Profile</h1>
          <p className="mt-2 max-w-2xl text-sm text-cyan-100/80">
            This is how you study best. We keep learning from your routine so your plan gets smarter.
          </p>
        </motion.div>
        <div className="flex flex-col items-end gap-2 text-xs text-cyan-200/70">
          <span className="rounded-full border border-cyan-500/30 px-3 py-1">Auto-updates</span>
          <span>Last refreshed {new Date(profile.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>

      {isLearning ? (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          Learning your pattern... keep logging study sessions for sharper insights.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-cyan-500/25 bg-zinc-950/50 p-5 shadow-inner">
          <p className="text-xs uppercase tracking-wider text-cyan-200/70">Your Brain's Prime Time</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-semibold text-white">{profile.peakProductivity.range}</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100">
              Peak focus window
            </span>
          </div>
          <p className="mt-3 text-sm text-cyan-100/70">
            Schedule heavy tasks here to ride your highest focus curve.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-zinc-950/60 p-5 shadow-inner">
          <p className="text-xs uppercase tracking-wider text-amber-200/70">Average Focus Duration</p>
          <p className="mt-3 text-3xl font-semibold text-white">
            {profile.focusDurationMinutes || 0} minutes
          </p>
          <p className="mt-2 text-sm text-amber-100/80">
            Ideal session length: {idealSession} minutes
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-amber-900/40">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-amber-400 to-emerald-400" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-emerald-200/80">Subject Strength Map</p>
          <div className="mt-4 space-y-3">
            {profile.strengths.length === 0 ? (
              <p className="text-sm text-emerald-100/70">
                Keep completing tasks to reveal subject strengths.
              </p>
            ) : (
              profile.strengths.map((row) => {
              const tone = strengthTones[row.level];
              return (
                <div key={row.subject} className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{row.subject}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${tone.chip}`}>
                      {tone.label}
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full ${tone.bar}`}
                      style={{ width: `${row.score}%` }}
                    />
                  </div>
                  <p className={`mt-2 text-xs ${tone.text}`}>{row.score}% confidence</p>
                </div>
              );
            })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-rose-200/80">Burnout Pattern</p>
          <div className={`mt-4 rounded-xl border px-3 py-3 text-sm ${burnoutTone}`}>
            {profile.burnoutPattern.note}
          </div>
          <p className="mt-3 text-xs text-rose-200/70">
            We will warn you before this pattern repeats.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-cyan-200/80">Energy Behavior</p>
          <p className="mt-3 text-sm text-cyan-100/80">{profile.energyBehavior.note}</p>
          <EnergySparkline points={profile.energyBehavior.trend} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-amber-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-amber-200/80">Consistency Score</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-3xl font-semibold text-white">{profile.consistency.score}</p>
            <p className="text-sm text-amber-100/80">You are consistent {profile.consistency.daysPerWeek} days/week</p>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={`day-${i}`}
                className={`h-8 rounded-lg ${i < profile.consistency.daysPerWeek ? "bg-amber-400/80" : "bg-amber-900/40"}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-emerald-200/80">Smart Insights</p>
          {profile.smartInsights.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-100/70">
              Keep studying to unlock smarter insights.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-emerald-100/90">
              {profile.smartInsights.map((insight) => (
                <li key={insight} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-cyan-200/80">Signals Powering Your DNA</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {dnaSignals.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100"
              >
                {signal}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-cyan-200/70">No manual input required.</p>
        </div>

        <div className="rounded-2xl border border-amber-500/25 bg-zinc-950/60 p-5">
          <p className="text-xs uppercase tracking-wider text-amber-200/80">How Your Insights Are Formed</p>
          <ol className="mt-4 space-y-3 text-sm text-amber-100/90">
            {dnaFlow.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/10 text-xs text-amber-200">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
