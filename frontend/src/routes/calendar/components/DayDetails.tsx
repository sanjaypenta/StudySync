import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Todo } from "@/lib/api";
import { subjectChipClass } from "@/lib/subjectColors";

interface DayDetailsProps {
  open: boolean;
  date: string;
  todos: Todo[];
  monthDates: string[];
  onClose: () => void;
  onCreateGoal: () => void;
  onUpdate: (id: string, patch: Partial<Todo>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DayDetails({
  open,
  date,
  todos,
  monthDates,
  onClose,
  onCreateGoal,
  onUpdate,
  onDelete,
}: DayDetailsProps) {
  const [local, setLocal] = useState<Record<string, Partial<Todo>>>({});

  useEffect(() => {
    setLocal({});
  }, [date, todos]);

  const displayDate = useMemo(() => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [date]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close"
          />
          <motion.div
            role="dialog"
            className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-zinc-950/80 backdrop-blur-xl shadow-2xl border border-violet-500/30 max-h-[85vh] flex flex-col text-violet-100"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="p-5 border-b border-violet-500/20 space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-fuchsia-200">
                  {displayDate}
                </h2>
                <p className="text-sm text-violet-300/60 mt-1">
                  {todos.length === 0
                    ? "No tasks yet."
                    : `${todos.length} task${todos.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCreateGoal();
                }}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-2.5 text-sm font-medium hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 transition-all"
              >
                Create study goal
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1 style-scrollbar">
              {todos.map((t) => {
                const chip = subjectChipClass(t.subject);
                const hours =
                  local[t.id]?.hours !== undefined
                    ? local[t.id].hours!
                    : t.hours;
                const moveDate =
                  local[t.id]?.date !== undefined ? local[t.id].date! : t.date;
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-violet-500/20 bg-black/30 p-4 space-y-3 shadow-inner"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-violet-200">
                          {t.task_title}
                        </p>
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-md border ${chip}`}
                        >
                          {t.subject}
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-violet-400/80 shrink-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            local[t.id]?.status !== undefined
                              ? local[t.id].status === "completed"
                              : t.status === "completed"
                          }
                          onChange={async (e) => {
                            const status = e.target.checked
                              ? "completed"
                              : "pending";
                            setLocal((s) => ({
                              ...s,
                              [t.id]: { ...s[t.id], status },
                            }));
                            await onUpdate(t.id, { status });
                          }}
                          className="rounded border-violet-500/40 bg-black/40 accent-violet-500 w-4 h-4"
                        />
                        Done
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-violet-400/80">Hours</label>
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          className="mt-0.5 w-full rounded-lg border border-violet-500/30 bg-black/40 text-violet-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-colors"
                          value={hours}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setLocal((s) => ({
                              ...s,
                              [t.id]: { ...s[t.id], hours: v },
                            }));
                          }}
                          onBlur={async () => {
                            const v = hours;
                            if (!Number.isFinite(v) || v < 0) return;
                            await onUpdate(t.id, { hours: v });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-violet-400/80">Move to</label>
                        <select
                          className="mt-0.5 w-full rounded-lg border border-violet-500/30 bg-black/40 text-violet-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-colors [color-scheme:dark]"
                          value={moveDate}
                          onChange={async (e) => {
                            const next = e.target.value;
                            setLocal((s) => ({
                              ...s,
                              [t.id]: { ...s[t.id], date: next },
                            }));
                            await onUpdate(t.id, { date: next });
                          }}
                        >
                          {monthDates.map((d) => (
                            <option key={d} value={d} className="bg-zinc-900">
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(t.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                    >
                      Delete task
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-violet-500/20 bg-zinc-950/40 rounded-b-2xl sm:rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-violet-500/30 py-2.5 text-sm font-medium text-violet-300 hover:bg-violet-900/30 hover:border-violet-500/50 hover:text-violet-100 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
