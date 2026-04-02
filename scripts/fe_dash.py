import pathlib
pathlib.Path(r"e:/StudySync/frontend/src/pages/Dashboard.tsx").write_text(r"""
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchTodosRange, prioritizeTodos, type Todo } from "@/lib/api";
import { SortableDaySection } from "@/components/SortableDaySection";
import { BurnoutPanel } from "@/components/BurnoutPanel";
import { FocusSessionBar } from "@/components/FocusSessionBar";
import { useAuth } from "@/context/AuthContext";

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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const rangeTo = useMemo(() => addDaysYmd(today, 7), [today]);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      await prioritizeTodos(today, rangeTo);
      const list = await fetchTodosRange(today, rangeTo);
      setTodos(list);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load your plan. Is MongoDB running?"
      );
      try {
        const list = await fetchTodosRange(today, rangeTo);
        setTodos(list);
      } catch {
        setTodos([]);
      }
    } finally {
      setLoading(false);
    }
  }, [today, rangeTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => groupByDate(todos), [todos]);
  const dates = useMemo(() => Array.from(byDate.keys()).sort(), [byDate]);

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
        <p className="mt-10 text-center text-sm text-violet-400/80">
          Loading quests…
        </p>
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
            initialItems={byDate.get(date) ?? []}
            onMergeDay={mergeDay}
          />
        ))}
      </div>
    </div>
  );
}
""".strip() + "\n", encoding="utf-8")
print("dashboard ok")
