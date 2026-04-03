import { useCallback, useEffect, useMemo, useState } from "react";
import { endStudySession, startStudySession, pauseStudySession, resumeStudySession } from "@/lib/api";
import { SessionMoodGate } from "@/components/SessionMoodGate";
import { useRewards } from "@/context/RewardContext";
import { pushRewardFromApi } from "@/lib/rewardHelpers";
import { useHud } from "@/context/HudContext";
import type { BreakPlan, SessionMood } from "@/lib/sessionBreakPolicy";
import { useFocusBreaks } from "@/hooks/useFocusBreaks";

export function FocusSessionBar() {
  const { push } = useRewards();
  const { refresh, state: hudState } = useHud();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pauses, setPauses] = useState<{start: number, end: number | null}[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [moodGateOpen, setMoodGateOpen] = useState(false);
  const [quickMood, setQuickMood] = useState<SessionMood | null>(null);
  const [breakBanner, setBreakBanner] = useState<BreakPlan | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, [sessionId, refresh]);

  const elapsedSec = useMemo(() => {
    if (!startedAt) return 0;
    let activeMs = 0;
    let lastStart = startedAt;
    for (const p of pauses) {
      const pStart = p.start;
      const pEnd = p.end ? p.end : now;
      activeMs += Math.max(0, pStart - lastStart);
      lastStart = pEnd;
    }
    activeMs += Math.max(0, now - lastStart);
    return Math.floor(activeMs / 1000);
  }, [startedAt, pauses, now]);

  const isPaused = pauses.length > 0 && pauses[pauses.length - 1].end === null;

  const energyPercent = hudState?.energyPercent ?? null;
  const effectiveMood: SessionMood | null =
    quickMood ?? (sessionId ? "normal" : null);

  const onBreakNudge = useCallback(
    (plan: BreakPlan) => {
      push({
        title: plan.headline,
        subtitle: `${plan.body} ${plan.energyLine}`,
      });
      setBreakBanner(plan);
    },
    [push]
  );

  const { resetSegment } = useFocusBreaks({
    active: Boolean(sessionId && startedAt && effectiveMood && !isPaused),
    mood: effectiveMood,
    energyPercent,
    nowMs: now,
    sessionAnchorMs: startedAt,
    onNudge: onBreakNudge,
  });

  async function handlePause() {
    if (!sessionId) return;
    try {
      await pauseStudySession(sessionId);
      setPauses(prev => [...prev, { start: Date.now(), end: null }]);
      void refresh(); // Pulls fresh energy that considers the new recovery phase
    } catch {
      setError("Failed to pause");
    }
  }

  async function handleResume() {
    if (!sessionId) return;
    try {
      await resumeStudySession(sessionId);
      setPauses(prev => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1].end = Date.now();
        }
        return copy;
      });
      void refresh();
    } catch {
      setError("Failed to resume");
    }
  }

  async function startWithMood(mood: SessionMood) {
    setMoodGateOpen(false);
    setQuickMood(mood);
    setError(null);
    try {
      const s = await startStudySession([], { mood });
      setSessionId(s.id);
      setStartedAt(Date.now());
      setPauses([]);
      setBreakBanner(null);
    } catch {
      setError("Could not start — is the API and MongoDB running?");
      setQuickMood(null);
    }
  }

  async function end(outcome: "completed" | "skipped" | "abandoned") {
    if (!sessionId) return;
    setError(null);
    try {
      const { reward, burnoutTip } = await endStudySession(sessionId, outcome);
      pushRewardFromApi(push, reward);
      if (burnoutTip) {
        push({ title: "Coach tip", subtitle: burnoutTip });
      }
      void refresh();
      setSessionId(null);
      setStartedAt(null);
      setPauses([]);
      setQuickMood(null);
      setBreakBanner(null);
    } catch {
      setError("Could not save session");
    }
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-zinc-950/60 p-4 shadow-inner flex flex-col gap-3">
      <SessionMoodGate
        open={moodGateOpen}
        onPick={(m) => void startWithMood(m)}
        onClose={() => setMoodGateOpen(false)}
        subtitle="Quick focus: how are you feeling? Breaks sync with your energy bar."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-100">Quick focus</p>
          <p className="text-xs text-violet-400/80">
            Track focus time for burnout insights. Mood tunes smart breaks.
          </p>
        </div>
        {!sessionId ? (
          <button
            type="button"
            onClick={() => setMoodGateOpen(true)}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white"
          >
            Start focus
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-sm tabular-nums ${isPaused ? 'text-amber-300' : 'text-cyan-200'}`}>
              {String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:
              {String(elapsedSec % 60).padStart(2, "0")}
            </span>
            {isPaused ? (
              <button
                type="button"
                onClick={() => void handleResume()}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-amber-500/20"
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handlePause()}
                className="rounded-lg border border-amber-500/50 hover:bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-200"
              >
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={() => void end("completed")}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => void end("skipped")}
              className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => void end("abandoned")}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500"
            >
              Abandon
            </button>
          </div>
        )}
      </div>

      {breakBanner && sessionId ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-amber-100/90">
            {breakBanner.headline} — try {breakBanner.breakSuggestionMinutes}{" "}
            min off-screen.
          </p>
          <button
            type="button"
            onClick={() => {
              setBreakBanner(null);
              resetSegment();
            }}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200"
          >
            Continue
          </button>
        </div>
      ) : null}

      {error && (
        <p className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
