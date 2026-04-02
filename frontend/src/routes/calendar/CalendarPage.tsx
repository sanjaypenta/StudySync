import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  bulkCreateTodos,
  deleteTodo,
  fetchTodosRange,
  generatePlan,
  patchTodo,
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
} from "./calendarUtils";
import { GoalModal } from "./components/GoalModal";
import { PlanPreview } from "./components/PlanPreview";
import { DayDetails } from "./components/DayDetails";
import { subjectChipClass } from "@/lib/subjectColors";
import { useHud } from "@/context/HudContext";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarPage() {
  const { refresh: refreshHud } = useHud();
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

  const loadTodos = useCallback(async () => {
    setLoadingTodos(true);
    try {
      const list = await fetchTodosRange(from, to);
      setTodos(list);
    } catch {
      setTodos([]);
    } finally {
      setLoadingTodos(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadTodos();
  }, [loadTodos]);

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
    <div className="min-h-0 bg-zinc-50/90 pb-8">
      {backendOk === false && (
        <div
          role="alert"
          className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-3 text-sm"
        >
          <strong className="font-semibold">Backend not reachable.</strong>{" "}
          The API must run on port 4000. From the repo root run{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
            npm run dev
          </code>{" "}
          (starts frontend + backend). Or in two terminals:{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
            npm run dev:backend
          </code>{" "}
          and{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
            npm run dev:frontend
          </code>
          .
        </div>
      )}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="text-sm text-violet-700 hover:text-violet-900 transition-colors"
            >
              ← Dashboard
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 mt-1">
              Calendar
            </h1>
            <p className="text-sm text-zinc-600 mt-1 max-w-md">
              Your to-dos appear on each day. Click{" "}
              <span className="font-medium text-zinc-800">Tasks</span> on a date
              to see the full list —{" "}
              <span className="font-medium text-violet-700">New goal</span> only
              creates a study plan.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              Today&apos;s tasks
            </button>
            <button
              type="button"
              onClick={() => openGoalForDate(today)}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white px-4 py-2 text-sm font-medium hover:opacity-95 transition-colors"
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
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            aria-label="Previous month"
          >
            ←
          </button>
          <h2 className="text-lg font-medium text-zinc-900">{monthLabel}</h2>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        {loadingTodos && (
          <div className="mb-6 space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-zinc-200/90" />
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-zinc-200/70"
                />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-center text-xs font-medium text-zinc-500 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="divide-y divide-zinc-100">
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 min-h-[100px]">
                {row.map((cell, ci) => {
                  if (!cell) {
                    return (
                      <div
                        key={`e-${ri}-${ci}`}
                        className="border-r border-zinc-50 last:border-r-0 bg-zinc-50/30"
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
                      className={`border-r border-zinc-100 last:border-r-0 p-1.5 text-left align-top flex flex-col ${
                        isToday
                          ? "ring-2 ring-inset ring-zinc-900/15 bg-amber-50/40"
                          : "hover:bg-zinc-50/80"
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <button
                          type="button"
                          onClick={() => openGoalForDate(cell)}
                          className="text-sm font-medium text-left text-zinc-700 hover:text-zinc-900"
                        >
                          {parseInt(cell.split("-")[2], 10)}
                          {isToday && (
                            <span className="ml-1 text-[10px] font-semibold uppercase text-amber-700">
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
                          className="shrink-0 text-[10px] font-semibold text-zinc-600 hover:text-zinc-900 px-1.5 py-0.5 rounded-md bg-zinc-100/90 hover:bg-zinc-200/90"
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
                              {t.subject} · {t.hours}h
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[10px] text-zinc-400">
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
          className="mt-8 rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
          aria-labelledby="month-tasks-heading"
        >
          <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/80 flex items-center justify-between gap-2">
            <div>
              <h2
                id="month-tasks-heading"
                className="text-sm font-semibold text-zinc-900"
              >
                Tasks this month
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {loadingTodos
                  ? "Loading…"
                  : `${sortedMonthTodos.length} task${
                      sortedMonthTodos.length === 1 ? "" : "s"
                    } in ${monthLabel}`}
              </p>
            </div>
          </div>
          <div className="max-h-[min(420px,55vh)] overflow-y-auto">
            {!loadingTodos && sortedMonthTodos.length === 0 && (
              <p className="px-4 py-10 text-sm text-zinc-500 text-center">
                No tasks this month yet. Confirm a plan from{" "}
                <span className="font-medium text-violet-700">New goal</span> or add
                tasks when your database is connected.
              </p>
            )}
            <ul className="divide-y divide-zinc-100">
              {sortedMonthTodos.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(t.date)}
                    className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 hover:bg-zinc-50/90 transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-500 tabular-nums shrink-0 sm:w-28">
                      {formatListDate(t.date)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-900 leading-snug break-words">
                        {t.task_title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${subjectChipClass(t.subject)}`}
                        >
                          {t.subject}
                        </span>
                        <span className="text-[11px] text-zinc-500">
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

        <p className="text-xs text-zinc-500 mt-4 text-center max-w-xl mx-auto">
          All tasks for this month are listed above. Click a row to edit that
          day. You can also use{" "}
          <strong className="font-medium text-zinc-700">Tasks</strong> on the
          grid or <strong className="font-medium text-violet-700">New goal</strong>{" "}
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
          className="rounded-full bg-zinc-900 text-white px-5 py-3 text-sm font-medium shadow-lg"
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
