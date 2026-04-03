import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  fetchTodosRange,
  postAutoRescue,
  prioritizeTodos,
  type Todo,
} from "@/lib/api";
import { SortableDaySection } from "@/components/SortableDaySection";
import { BurnoutPanel } from "@/components/BurnoutPanel";
import { FocusSessionBar } from "@/components/FocusSessionBar";
import { useAuth } from "@/context/AuthContext";
import { useRewards } from "@/context/RewardContext";
import { useHud } from "@/context/HudContext";
import { CompanionCard } from "@/components/CompanionCard";

function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function groupByDate(todos: Todo[]): Map<string, Todo[]> {
  const m = new Map<string, Todo[]>();
  for (const t of todos) {
    const arr = m.get(t.date) ?? [];
    arr.push(t);
    m.set(t.date, arr);
  }
  for (const [, arr] of m) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }
  return m;
}

const pillars = [
  {
    to: "/calendar",
    title: "Calendar",
    desc: "Plan goals & spawn daily quests.",
    accent: "from-violet-600/30 to-fuchsia-600/20 border-violet-500/40",
  },
  {
    to: "/study-dna",
    title: "Study DNA",
    desc: "Your learning pattern, visualized.",
    accent: "from-emerald-600/25 to-cyan-600/20 border-emerald-500/35",
  },
  {
    to: "/self-study",
    title: "Self-study",
    desc: "Per-task timers, XP on complete.",
    accent: "from-cyan-600/25 to-violet-600/20 border-cyan-500/35",
  },
  {
    to: "/study-room",
    title: "Group arena",
    desc: "Rooms, MCQs, leaderboard.",
    accent: "from-amber-600/25 to-rose-600/20 border-amber-500/35",
  },
];

export function Dashboard() {
  const { user, logout } = useAuth();
  const { push } = useRewards();
  const { state: hudState, refresh: refreshHud } = useHud();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const rangeFrom = useMemo(() => addDaysYmd(today, -28), [today]);
  const rangeTo = useMemo(() => addDaysYmd(today, 7), [today]);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescuing, setRescuing] = useState(false);

  const mergeDay = useCallback((date: string, dayTodos: Todo[]) => {
    setTodos((prev) => {
      const rest = prev.filter((t) => t.date !== date);
      return [...rest, ...dayTodos];
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await prioritizeTodos(rangeFrom, rangeTo);
      const list = await fetchTodosRange(rangeFrom, rangeTo);
      setTodos(list);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load your plan. Is MongoDB running?"
      );
      try {
        const list = await fetchTodosRange(rangeFrom, rangeTo);
        setTodos(list);
      } catch {
        setTodos([]);
      }
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => groupByDate(todos), [todos]);
  const dates = useMemo(() => Array.from(byDate.keys()).sort(), [byDate]);

  const hasOverduePending = useMemo(
    () =>
      todos.some(
        (t) => t.status === "pending" && t.date.localeCompare(today) < 0
      ),
    [todos, today]
  );

  async function runRescue() {
    setRescuing(true);
    try {
      const r = await postAutoRescue(21);
      push({
        title: r.toastTitle,
        subtitle: r.moved > 0 ? r.toastSubtitle : r.message,
      });
      await load();
      void refreshHud();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rescue failed");
    } finally {
      setRescuing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
            Command center
          </h1>
          <p className="mt-2 text-violet-200/70">
            {user?.displayName
              ? `Hey ${user.displayName} — `
              : ""}
            Drag tasks to reorder. Tags show AI priority.
          </p>
        </motion.div>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-xl border border-violet-500/30 px-3 py-1.5 text-xs text-violet-300 hover:bg-violet-950/50"
        >
          Log out
        </button>
      </div>

      <div className="mt-6">
        <CompanionCard companion={hudState?.companion ?? null} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {pillars.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            className={`group rounded-2xl border bg-gradient-to-br p-5 shadow-lg transition hover:scale-[1.02] ${p.accent}`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">
              Mode
            </p>
            <p className="mt-2 text-lg font-bold text-white">{p.title}</p>
            <p className="mt-2 text-sm text-violet-200/80">{p.desc}</p>
            <p className="mt-4 text-xs font-medium text-fuchsia-300/90 group-hover:underline">
              Enter →
            </p>
          </Link>
        ))}
      </div>

      {hasOverduePending && (
        <div
          className="mt-6 rounded-2xl border border-cyan-500/35 bg-cyan-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          role="status"
        >
          <p className="text-sm text-cyan-100/95">
            Some tasks stayed in the past — no stress. We can redistribute them
            onto today and the days ahead.
          </p>
          <button
            type="button"
            disabled={rescuing}
            onClick={() => void runRescue()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-95"
          >
            {rescuing ? "Adjusting…" : "Adjust my plan"}
          </button>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <FocusSessionBar />
        <BurnoutPanel />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/calendar"
          className="inline-flex rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Calendar & goals
        </Link>
        <Link
          to="/self-study"
          className="inline-flex rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-5 py-2.5 text-sm font-medium text-cyan-100 hover:bg-cyan-950/70"
        >
          Self-study
        </Link>
        <Link
          to="/study-room"
          className="inline-flex rounded-xl border border-amber-500/40 bg-amber-950/30 px-5 py-2.5 text-sm font-medium text-amber-100 hover:bg-amber-950/50"
        >
          Group room
        </Link>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex rounded-xl border border-zinc-600 bg-zinc-900/60 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        >
          Refresh priorities
        </button>
      </div>

      {loading && (
        <div className="mt-10 space-y-4">
          <div className="h-8 w-56 animate-pulse rounded-xl bg-violet-900/40" />
          <div className="h-32 animate-pulse rounded-2xl bg-violet-950/30" />
          <div className="h-32 animate-pulse rounded-2xl bg-violet-950/30" />
        </div>
      )}
      {error && (
        <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-center text-sm text-amber-100">
          {error}
        </p>
      )}

      {!loading && dates.length === 0 && !error && (
        <div className="mt-10 rounded-2xl border border-dashed border-violet-500/30 bg-violet-950/20 px-6 py-10 text-center">
          <p className="text-violet-200">No tasks in range yet.</p>
          <p className="mt-2 text-sm text-violet-400/80">
            Open Calendar and add a goal to generate your plan.
          </p>
          <Link
            className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            to="/calendar"
          >
            Go to calendar
          </Link>
        </div>
      )}

      <div className="mt-10 space-y-8">
        {dates.map((date) => (
          <SortableDaySection
            key={date}
            date={date}
            isToday={date === today}
            initialItems={(byDate.get(date) ?? []).filter(
              (t) => t.status !== "completed"
            )}
            onMergeDay={mergeDay}
          />
        ))}
      </div>
    </div>
  );
}
