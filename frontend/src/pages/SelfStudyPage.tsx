import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  endStudySession,
  fetchActiveSession,
  fetchTodosForDate,
  patchTodo,
  prioritizeTodos,
  startStudySession,
  type Todo,
} from "@/lib/api";
import { SessionMoodGate } from "@/components/SessionMoodGate";
import { useRewards } from "@/context/RewardContext";
import { useHud } from "@/context/HudContext";
import { pushRewardFromApi } from "@/lib/rewardHelpers";
import {
  sortTodosForMood,
  type BreakPlan,
  type SessionMood,
} from "@/lib/sessionBreakPolicy";
import { useFocusBreaks } from "@/hooks/useFocusBreaks";

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function SelfStudyPage() {
  const { push } = useRewards();
  const { refresh, state: hudState } = useHud();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrow = useMemo(() => addDaysYmd(today, 1), [today]);

  const ENERGY_EXHAUSTED_THRESHOLD = 5;
  const energyPercent = hudState?.energyPercent ?? null;
  const energyNotExhausted = energyPercent == null ? false : energyPercent > ENERGY_EXHAUSTED_THRESHOLD;

  const [activeDate, setActiveDate] = useState<string>(today);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [studyMood, setStudyMood] = useState<SessionMood | null>(null);
  const [moodGateOpen, setMoodGateOpen] = useState(false);
  const [pendingTodoId, setPendingTodoId] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);
  const [breakBanner, setBreakBanner] = useState<BreakPlan | null>(null);
  const restoredSessionRef = useRef(false);

  const load = useCallback(
    async (date: string, opts?: { skipPrioritize?: boolean }) => {
      setLoading(true);
      setErr(null);
      try {
        if (!opts?.skipPrioritize) {
          await prioritizeTodos(date, date);
        }
        const list = await fetchTodosForDate(date);
        setTodos(list);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(activeDate);
  }, [activeDate, load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchActiveSession();
      if (cancelled || !s) return;
      restoredSessionRef.current = true;
      setSessionId(s.id);
      setStartedAtMs(new Date(s.started_at).getTime());
      setActiveTodoId(s.todo_ids[0] ?? null);
      setStudyMood(s.session_mood ?? "normal");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !startedAtMs) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sessionId, startedAtMs]);

  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, [sessionId, refresh]);

  const elapsed =
    sessionId && startedAtMs ? Math.max(0, now - startedAtMs) : 0;

  const effectiveMood: SessionMood | null =
    studyMood ?? (sessionId ? "normal" : null);

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
    active: Boolean(sessionId && startedAtMs && effectiveMood),
    mood: effectiveMood,
    energyPercent,
    nowMs: now,
    sessionAnchorMs: startedAtMs,
    onNudge: onBreakNudge,
  });

  useEffect(() => {
    if (!sessionId || !startedAtMs || !restoredSessionRef.current) return;
    restoredSessionRef.current = false;
    resetSegment();
  }, [sessionId, startedAtMs, resetSegment]);

  const pendingTodos = useMemo(
    () => todos.filter((t) => t.status === "pending"),
    [todos]
  );

  const displayTodos = useMemo(
    () => sortTodosForMood(pendingTodos, studyMood),
    [pendingTodos, studyMood]
  );

  const hasAnyTodosForActiveDate = todos.length > 0;
  const clearedAllForActiveDate = hasAnyTodosForActiveDate && pendingTodos.length === 0;
  const canUnlockTomorrow =
    activeDate === today &&
    clearedAllForActiveDate &&
    energyNotExhausted &&
    !sessionId;

  function openMoodGateForTodo(todoId: string) {
    if (sessionId && activeTodoId && activeTodoId !== todoId) {
      setConfirmSwitch(todoId);
      return;
    }
    setPendingTodoId(todoId);
    setMoodGateOpen(true);
  }

  async function startSessionWithMood(mood: SessionMood) {
    const todoId = pendingTodoId;
    setMoodGateOpen(false);
    setPendingTodoId(null);
    if (!todoId) return;
    setStudyMood(mood);
    try {
      const s = await startStudySession([todoId], { mood });
      setSessionId(s.id);
      setStartedAtMs(Date.now());
      setActiveTodoId(todoId);
      setBreakBanner(null);
    } catch {
      setErr("Could not start focus session.");
    }
  }

  async function confirmSwitchOk() {
    const next = confirmSwitch;
    const sid = sessionId;
    setConfirmSwitch(null);
    if (!next || !sid) return;
    try {
      const { reward } = await endStudySession(sid, "abandoned");
      pushRewardFromApi(push, reward);
    } catch {
      /* ignore */
    }
    try {
      const m = studyMood ?? "normal";
      const s = await startStudySession([next], { mood: m });
      setSessionId(s.id);
      setStartedAtMs(Date.now());
      setActiveTodoId(next);
      setBreakBanner(null);
      void refresh();
    } catch {
      setErr("Could not start focus session.");
      setSessionId(null);
      setStartedAtMs(null);
      setActiveTodoId(null);
    }
  }

  async function stopFocus(outcome: "completed" | "skipped" | "abandoned") {
    if (!sessionId) return;
    try {
      const { reward, burnoutTip } = await endStudySession(sessionId, outcome);
      pushRewardFromApi(push, reward);
      if (burnoutTip) {
        push({
          title: "Coach tip",
          subtitle: burnoutTip,
        });
      }
      if (outcome === "completed" && activeTodoId) {
        const { reward: r2 } = await patchTodo(activeTodoId, {
          status: "completed",
        });
        pushRewardFromApi(push, r2);
      }
      void refresh();
    } catch {
      setErr("Could not end session.");
    } finally {
      setSessionId(null);
      setStartedAtMs(null);
      setActiveTodoId(null);
      setBreakBanner(null);
      void load(activeDate, { skipPrioritize: true });
    }
  }

  return (
    <div className="space-y-8">
      <SessionMoodGate
        open={moodGateOpen}
        onPick={(m) => void startSessionWithMood(m)}
        onClose={() => {
          setMoodGateOpen(false);
          setPendingTodoId(null);
        }}
      />

      <div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-violet-200">
          Self-study arena
        </h1>
        <p className="mt-1 text-sm text-violet-300/70">
          One focus timer at a time. Pick how you feel — we tune breaks from your
          energy bar and task order.
        </p>
      </div>

      {confirmSwitch ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4">
          <div className="max-w-sm rounded-2xl border border-violet-500/40 bg-zinc-950 p-6 shadow-2xl">
            <p className="text-sm text-violet-100">
              Stop your current focus to start a new task?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-medium text-white"
                onClick={() => void confirmSwitchOk()}
              >
                Yes, switch
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-zinc-600 py-2 text-sm text-zinc-300"
                onClick={() => setConfirmSwitch(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-violet-950/40"
            />
          ))}
        </div>
      ) : null}

      {err ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {err}
        </p>
      ) : null}

      {!loading && !displayTodos.length ? (
        <div className="rounded-2xl border border-dashed border-violet-500/30 bg-violet-950/10 px-6 py-12 text-center">
          <p className="text-violet-200">
            {hasAnyTodosForActiveDate ? "All done for today." : "No quests scheduled for today."}
          </p>
          <p className="mt-2 text-sm text-violet-400/80">
            {hasAnyTodosForActiveDate
              ? "Nice work. If you still have energy, you can continue." 
              : "Add tasks from the calendar to populate today's list."}
          </p>
        </div>
      ) : null}

      {activeDate === today && clearedAllForActiveDate ? (
        <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-cyan-100">
              Today's quests cleared.
            </p>
            <p className="mt-1 text-xs text-cyan-200/70">
              {sessionId
                ? "Finish your current focus first."
                : energyPercent == null
                  ? "Syncing your energy bar…"
                  : energyNotExhausted
                    ? "Energy left — you can pull tomorrow's tasks early."
                    : "Energy is exhausted — rest now to protect consistency."}
            </p>
          </div>
          <button
            type="button"
            disabled={!canUnlockTomorrow}
            onClick={() => setActiveDate(tomorrow)}
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Continue to tomorrow
          </button>
        </div>
      ) : null}

      {activeDate !== today ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/15 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-100">
              You're previewing {activeDate}.
            </p>
            <p className="mt-1 text-xs text-amber-200/70">
              These are pulled early because you finished today with energy left.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(sessionId)}
            onClick={() => setActiveDate(today)}
            className="rounded-xl border border-amber-500/30 bg-black/20 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
          >
            Back to today
          </button>
        </div>
      ) : null}

      {breakBanner && sessionId ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-100">
              {breakBanner.headline}
            </p>
            <p className="text-xs text-amber-200/80 mt-1">
              Suggested break: {breakBanner.breakSuggestionMinutes} min
              {breakBanner.mandatoryBreakMinutes != null
                ? ` (aim for at least ${breakBanner.mandatoryBreakMinutes} min)`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBreakBanner(null);
              resetSegment();
            }}
            className="rounded-xl bg-amber-500/90 px-4 py-2 text-sm font-semibold text-zinc-900"
          >
            Continue sprint
          </button>
        </div>
      ) : null}

      <ul className="space-y-3">
        {displayTodos.map((t) => {
          const isActive = activeTodoId === t.id && sessionId;
          return (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-zinc-950/60 px-4 py-4 shadow-inner"
            >
              <div>
                <p className="font-medium text-violet-50">{t.task_title}</p>
                <p className="text-xs text-violet-400">
                  {t.subject} · {t.date} · {t.hours}h
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isActive ? (
                  <span className="font-mono text-lg text-cyan-200 tabular-nums">
                    {formatElapsed(elapsed)}
                  </span>
                ) : null}
                {!isActive ? (
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => openMoodGateForTodo(t.id)}
                  >
                    Start focus
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                      onClick={() => void stopFocus("completed")}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-zinc-600 px-3 py-2 text-xs text-zinc-300"
                      onClick={() => void stopFocus("skipped")}
                    >
                      Skip
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
