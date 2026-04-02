import { useEffect, useState } from "react";
import { endStudySession, startStudySession } from "@/lib/api";
import { useRewards } from "@/context/RewardContext";
import { pushRewardFromApi } from "@/lib/rewardHelpers";
import { useHud } from "@/context/HudContext";

export function FocusSessionBar() {
  const { push } = useRewards();
  const { refresh } = useHud();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

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

  const elapsedSec =
    startedAt === null ? 0 : Math.floor((now - startedAt) / 1000);

  async function start() {
    setError(null);
    try {
      const s = await startStudySession([]);
      setSessionId(s.id);
      setStartedAt(Date.now());
    } catch {
      setError("Could not start — is the API and MongoDB running?");
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
    } catch {
      setError("Could not save session");
    }
  }

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-zinc-950/60 p-4 shadow-inner flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-violet-100">Quick focus</p>
        <p className="text-xs text-violet-400/80">
          Track focus time for burnout insights (not tied to a single task).
        </p>
      </div>
      {!sessionId ? (
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white"
        >
          Start focus
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm tabular-nums text-cyan-200">
            {String(Math.floor(elapsedSec / 60)).padStart(2, "0")}:
            {String(elapsedSec % 60).padStart(2, "0")}
          </span>
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
      {error && (
        <p className="w-full text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
