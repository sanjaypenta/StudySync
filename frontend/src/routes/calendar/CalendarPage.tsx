import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  bulkCreateTodos,
  deleteTodo,
  fetchTodosRange,
  generatePlan,
  patchTodo,
  postAutoRescue,
  type GeneratePlanMeta,
  type GoalType,
  type PlanDay,
  type Todo,
} from "@/lib/api";
import { loadProfile, saveProfile, type UserProfile } from "@/lib/profile";
import {
  toYmd,
  getMonthGrid,
  monthRange,
  gridDateOptions,
  addDaysYmd,
  minYmd,
} from "./calendarUtils";
import { GoalModal } from "./components/GoalModal";
import { PlanPreview } from "./components/PlanPreview";
import { DayDetails } from "./components/DayDetails";
import { subjectChipClass } from "@/lib/subjectColors";
import { useHud } from "@/context/HudContext";
import { useRewards } from "@/context/RewardContext";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPage() {
  const { refresh: refreshHud } = useHud();
  const { push } = useRewards();
  const today = useMemo(() => toYmd(new Date()), []);
  const [view, setView] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });

  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const grid = useMemo(
    () => getMonthGrid(view.year, view.month),
    [view.year, view.month]
  );
  const { from, to } = monthRange(view.year, view.month);
  const moveDateOptions = useMemo(() => gridDateOptions(grid), [grid]);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(true);
  const [rescuing, setRescuing] = useState(false);

  const loadTodos = useCallback(async () => {
    setLoadingTodos(true);
    try {
      const fetchFrom = minYmd(from, addDaysYmd(today, -90));
      const list = await fetchTodosRange(fetchFrom, to);
      setTodos(list);
    } catch {
      setTodos([]);
    } finally {
      setLoadingTodos(false);
    }
  }, [from, to, today]);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

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
      await loadTodos();
      void refreshHud();
    } finally {
      setRescuing(false);
    }
  }

  const todosByDate = useMemo(() => {
    const m = new Map<string, Todo[]>();
    for (const t of todos) {
      const arr = m.get(t.date) ?? [];
      arr.push(t);
      m.set(t.date, arr);
    }
    return m;
  }, [todos]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDeadline, setGoalDeadline] = useState(today);

  const [genLoading, setGenLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<PlanDay[]>([]);
  const [previewMeta, setPreviewMeta] = useState<GeneratePlanMeta | null>(null);
  const [previewSubject, setPreviewSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingGoal, setPendingGoal] = useState<{
    title: string;
    subject: string;
  } | null>(null);

  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch("/api/health");
        if (!cancelled) setBackendOk(r.ok);
      } catch {
        if (!cancelled) setBackendOk(false);
      }
    };
    void check();
    const id = window.setInterval(check, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const openGoalForDate = (ymd: string) => {
    setGoalDeadline(ymd);
    setGoalOpen(true);
  };

  const handleGenerate = async (input: {
    title: string;
    subject: string;
    deadline: string;
    totalHours: number;
    goalType: GoalType;
    topics: string;
    pdfNotes: string;
    pdfFile: File | null;
    topicsPerDay: number;
  }) => {
    setGenLoading(true);
    setPendingGoal({ title: input.title, subject: input.subject });
    try {
      const { plan, meta } = await generatePlan({
        taskTitle: input.title,
        subject: input.subject,
        totalHours: input.totalHours,
        deadline: input.deadline,
        today,
        profile,
        goalType: input.goalType,
        topics: input.topics,
        pdfNotes: input.pdfNotes,
        pdfFile: input.pdfFile,
        topicsPerDay: input.topicsPerDay,
      });
      setPreviewSubject(input.subject);
      setPreviewPlan(plan);
      setPreviewMeta(meta);
      setGoalOpen(false);
      setPreviewOpen(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not generate plan.";
      alert(msg);
    } finally {
      setGenLoading(false);
    }
  };

  const confirmPlan = async () => {
    if (!pendingGoal || previewPlan.length === 0) return;
    setSaving(true);
    try {
      await bulkCreateTodos(
        previewPlan.map((d) => ({
          task_title: d.task,
          subject: pendingGoal.subject,
          date: d.date,
          hours: d.hours,
        }))
      );
      setPreviewOpen(false);
      setPendingGoal(null);
      setPreviewPlan([]);
      setPreviewMeta(null);
      await loadTodos();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not save tasks.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const editPlan = () => {
    setPreviewOpen(false);
    setPreviewMeta(null);
    setGoalOpen(true);
  };

  const monthLabel = new Date(view.year, view.month, 1).toLocaleString(
    undefined,
    { month: "long", year: "numeric" }
  );

  const prevMonth = () => {
    setView((v) => {
      const m = v.month - 1;
      if (m < 0) return { year: v.year - 1, month: 11 };
      return { year: v.year, month: m };
    });
  };

  const nextMonth = () => {
    setView((v) => {
      const m = v.month + 1;
      if (m > 11) return { year: v.year + 1, month: 0 };
      return { year: v.year, month: m };
    });
  };

  const selectedTodos = selectedDate
    ? (todosByDate.get(selectedDate) ?? []).filter(
        (t) => t.status !== "completed"
      )
    : [];

  const sortedMonthTodos = useMemo(() => {
    return [...todos]
      .filter((t) => t.status !== "completed")
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.task_title.localeCompare(b.task_title);
      });
  }, [todos]);

  const formatListDate = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-0 bg-[#0c0518] pb-8 text-violet-100">
      {backendOk === false && (
        <div
          role="alert"
          className="bg-amber-950/60 border-b border-amber-500/30 text-amber-300 px-4 py-3 text-sm"
        >
          <strong className="font-semibold">Backend not reachable.</strong>{" "}
          The API must run on port 4000. From the repo root run{" "}
          <code className="rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-200">
            npm run dev
          </code>{" "}
          (starts frontend + backend). Or in two terminals:{" "}
          <code className="rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-200">
            npm run dev:backend
          </code>{" "}
          and{" "}
          <code className="rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-200">
            npm run dev:frontend
          </code>
          .
        </div>
      )}
      <header className="border-b border-violet-500/20 bg-zinc-950/60 sticky top-0 z-10 backdrop-blur-sm shadow-lg shadow-black/20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="text-sm text-violet-400 hover:text-violet-200 transition-colors"
            >
              â† Dashboard
            </Link>
            <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200 mt-1">
              Calendar
            </h1>
            <p className="text-sm text-violet-300/60 mt-1 max-w-md">
              Your to-dos appear on each day. Click{" "}
              <span className="font-medium text-violet-200">Tasks</span> on a date
              to see the full list â€”{" "}
              <span className="font-medium text-fuchsia-400">New goal</span> only
              creates a study plan.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {hasOverduePending ? (
              <button
                type="button"
                disabled={rescuing}
                onClick={() => void runRescue()}
                className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-900/40 transition-colors disabled:opacity-50"
              >
                {rescuing ? "Adjustingâ€¦" : "Rescue overdue"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-xl border border-violet-500/30 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-950/50 hover:border-violet-400/50 transition-colors"
            >
              Today&apos;s tasks
            </button>
            <button
              type="button"
              onClick={() => openGoalForDate(today)}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2 text-sm font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-900/30"
            >
              New goal
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg border border-violet-500/30 bg-zinc-900/50 px-3 py-1.5 text-sm text-violet-300 hover:bg-violet-950/50 transition-colors"
            aria-label="Previous month"
          >
            â†
          </button>
          <h2 className="text-lg font-medium text-violet-100">{monthLabel}</h2>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-violet-500/30 bg-zinc-900/50 px-3 py-1.5 text-sm text-violet-300 hover:bg-violet-950/50 transition-colors"
            aria-label="Next month"
          >
            â†’
          </button>
        </div>

        {loadingTodos && (
          <div className="mb-6 space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-violet-900/40" />
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-violet-900/20"
                />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-violet-500/20 bg-zinc-950/60 shadow-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-violet-500/20 bg-black/30">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-medium text-violet-400/70 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="divide-y divide-violet-500/10">
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 min-h-[100px]">
                {row.map((cell, ci) => {
                  if (!cell) {
                    return (
                      <div
                        key={`e-${ri}-${ci}`}
                        className="border-r border-violet-500/10 last:border-r-0 bg-black/20"
                      />
                    );
                  }
                  const isToday = cell === today;
                  const dayTasks = (todosByDate.get(cell) ?? []).filter(
                    (t) => t.status !== "completed"
                  );
                  return (
                    <div
                      key={cell}
                      className={`border-r border-violet-500/10 last:border-r-0 p-1.5 text-left align-top flex flex-col ${
                        isToday
                          ? "bg-fuchsia-950/30 ring-2 ring-inset ring-fuchsia-500/30"
                          : "hover:bg-violet-950/30"
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => openGoalForDate(cell)}
                          className={`text-sm font-medium text-left ${
                            isToday ? "text-fuchsia-300" : "text-violet-300 hover:text-violet-100"
                          }`}
                        >
                          {parseInt(cell.split("-")[2], 10)}
                          {isToday && (
                            <span className="ml-1 text-[10px] font-semibold uppercase text-fuchsia-400">
                              Today
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(cell);
                          }}
                          className="shrink-0 text-[10px] font-semibold text-violet-400 hover:text-violet-200 px-1.5 py-0.5 rounded-md bg-violet-900/40 hover:bg-violet-800/50 transition-colors"
                          title="View and edit tasks for this day"
                        >
                          Tasks
                        </button>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => openGoalForDate(cell)}
                        className="flex-1 text-left min-h-[52px]"
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="space-y-1">
                          {dayTasks.slice(0, 3).map((t) => (
                            <div
                              key={t.id}
                              className={`text-[11px] leading-tight truncate rounded px-1 py-0.5 border ${subjectChipClass(t.subject)}`}
                            >
                              {t.subject} Â· {t.hours}h
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[10px] text-violet-400/60">
                              +{dayTasks.length - 3} more
                            </span>
                          )}
                        </div>
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <section
          className="mt-8 rounded-2xl border border-violet-500/20 bg-zinc-950/60 shadow-xl overflow-hidden"
          aria-labelledby="month-tasks-heading"
        >
          <div className="px-4 py-3 border-b border-violet-500/15 bg-black/30 flex items-center justify-between gap-2">
            <div>
              <h2
                id="month-tasks-heading"
                className="text-sm font-semibold text-violet-100"
              >
                Tasks this month
              </h2>
              <p className="text-xs text-violet-400/60 mt-0.5">
                {loadingTodos
                  ? "Loadingâ€¦"
                  : `${sortedMonthTodos.length} task${
                      sortedMonthTodos.length === 1 ? "" : "s"
                    } in ${monthLabel}`}
              </p>
            </div>
          </div>
          <div className="max-h-[min(420px,55vh)] overflow-y-auto">
            {!loadingTodos && sortedMonthTodos.length === 0 && (
              <p className="px-4 py-10 text-sm text-violet-400/60 text-center">
                No tasks this month yet. Confirm a plan from{" "}
                <span className="font-medium text-fuchsia-400">New goal</span> or add
                tasks when your database is connected.
              </p>
            )}
            <ul className="divide-y divide-violet-500/10">
              {sortedMonthTodos.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(t.date)}
                    className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 hover:bg-violet-950/30 transition-colors"
                  >
                    <span className="text-xs font-medium text-violet-400/70 tabular-nums shrink-0 sm:w-28">
                      {formatListDate(t.date)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-violet-100 leading-snug break-words">
                        {t.task_title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${subjectChipClass(t.subject)}`}
                        >
                          {t.subject}
                        </span>
                        <span className="text-[11px] text-violet-400/60">
                          {t.hours} hr
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="text-xs text-violet-400/40 mt-4 text-center max-w-xl mx-auto">
          All tasks for this month are listed above. Click a row to edit that
          day. You can also use{" "}
          <strong className="font-medium text-violet-300">Tasks</strong> on the
          grid or <strong className="font-medium text-fuchsia-400">New goal</strong>{" "}
          to create a plan.
        </p>
      </main>

      <DayDetails
        open={selectedDate !== null}
        date={selectedDate ?? today}
        todos={selectedTodos}
        monthDates={moveDateOptions}
        onClose={() => setSelectedDate(null)}
        onCreateGoal={() => {
          if (selectedDate) setGoalDeadline(selectedDate);
          setSelectedDate(null);
          setGoalOpen(true);
        }}
        onUpdate={async (id, patch) => {
          await patchTodo(id, patch);
          await loadTodos();
          void refreshHud();
        }}
        onDelete={async (id) => {
          await deleteTodo(id);
          await loadTodos();
          void refreshHud();
        }}
      />

      <div className="fixed bottom-6 right-6 z-20 sm:hidden">
        <button
          type="button"
          onClick={() => openGoalForDate(today)}
          className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-5 py-3 text-sm font-medium shadow-lg shadow-violet-900/40"
        >
          New goal
        </button>
      </div>

      <GoalModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        defaultDeadline={goalDeadline}
        profile={profile}
        onProfileChange={setProfile}
        onGenerate={handleGenerate}
        loading={genLoading}
      />

      <PlanPreview
        open={previewOpen}
        subject={previewSubject}
        plan={previewPlan}
        meta={previewMeta}
        onPlanChange={setPreviewPlan}
        maxHoursPerDay={profile.dailyStudyHoursLimit}
        onMetaChange={setPreviewMeta}
        onConfirm={confirmPlan}
        onEdit={editPlan}
        onClose={() => setPreviewOpen(false)}
        saving={saving}
      />
    </div>
  );
}
