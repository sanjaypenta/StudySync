import { useCallback, useEffect, useMemo, useState } from "react";
import {
  endStudySession,
  fetchActiveSession,
  fetchTodosRange,
  patchTodo,
  prioritizeTodos,
  startStudySession,
  type Todo,
} from "@/lib/api";
import { useRewards } from "@/context/RewardContext";
import { useHud } from "@/context/HudContext";
import { pushRewardFromApi } from "@/lib/rewardHelpers";

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
  const { refresh } = useHud();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const rangeTo = useMemo(() => addDaysYmd(today, 7), [today]);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { skipPrioritize?: boolean }) => {
      setLoading(true);
      setErr(null);
      try {
        if (!opts?.skipPrioritize) {
          await prioritizeTodos(today, rangeTo);
        }
        const list = await fetchTodosRange(today, rangeTo);
        setTodos(list.filter((t) => t.status === "pending"));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    },
    [today, rangeTo]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchActiveSession();
      if (cancelled || !s) return;
      setSessionId(s.id);
      setStartedAtMs(new Date(s.started_at).getTime());
      setActiveTodoId(s.todo_ids[0] ?? null);
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

  async function beginFocus(todoId: string) {
    if (sessionId && activeTodoId && activeTodoId !== todoId) {
      setConfirmSwitch(todoId);
      return;
    }
    try {
      const s = await startStudySession([todoId]);
      setSessionId(s.id);
      setStartedAtMs(Date.now());
      setActiveTodoId(todoId);
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
      const s = await startStudySession([next]);
      setSessionId(s.id);
      setStartedAtMs(Date.now());
      setActiveTodoId(next);
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
        const { reward: r2 } = await patchTodo(activeTodoId, { status: "completed" });
        pushRewardFromApi(push, r2);
      }
      void refresh();
    } catch {
      setErr("Could not end session.");
    } finally {
      setSessionId(null);
      setStartedAtMs(null);
      setActiveTodoId(null);
      void load({ skipPrioritize: true });
    }
  }

  const pending = todos;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-violet-200">
          Self-study arena
        </h1>
        <p className="mt-1 text-sm text-violet-300/70">
          One focus timer at a time. Complete a session to earn XP and a coach tip.
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
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-violet-950/40" />
          ))}
        </div>
      ) : null}

      {err ? (
        <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
          {err}
        </p>
      ) : null}

      {!loading && !pending.length ? (
        <div className="rounded-2xl border border-dashed border-violet-500/30 bg-violet-950/10 px-6 py-12 text-center">
          <p className="text-violet-200">No pending quests in the next week.</p>
          <p className="mt-2 text-sm text-violet-400/80">
            Add tasks from the calendar to populate this list.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {pending.map((t) => {
          const isActive = activeTodoId === t.id && sessionId;
          return (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-zinc-950/60 px-4 py-4 shadow-inner"
            >
              <div>
                <p className="font-medium text-violet-50">{t.task_title}</p>
                <p className="text-xs text-violet-400">{t.subject} · {t.date}</p>
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
                    onClick={() => void beginFocus(t.id)}
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
