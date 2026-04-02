import type { ITodo } from "../models/Todo.js";

export type PrioritizeOptions = {
  /** Max tasks per day to highlight (interventions may lower this). */
  maxPerDay?: number;
};

/**
 * Assign priority tags, sort order, and placeholder time slots per day.
 * Tags up to `maxPerDay` (default 6) top pending tasks per day.
 */
export function applyDailyPrioritization(
  todos: ITodo[],
  options?: PrioritizeOptions
): void {
  const maxPerDay = Math.min(6, Math.max(1, options?.maxPerDay ?? 6));
  const byDate = new Map<string, ITodo[]>();
  for (const t of todos) {
    const arr = byDate.get(t.date) ?? [];
    arr.push(t);
    byDate.set(t.date, arr);
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const [, list] of byDate) {
    const pending = list
      .filter((t) => t.status === "pending")
      .sort((a, b) => {
        const da = a.date.localeCompare(today);
        const db = b.date.localeCompare(today);
        if (da !== db) return da - db;
        if (b.hours !== a.hours) return b.hours - a.hours;
        return a.subject.localeCompare(b.subject);
      });

    const cap = Math.min(maxPerDay, pending.length);
    const picked = pending.slice(0, cap);

    for (const t of list) {
      if (t.status !== "pending") continue;
      const idx = picked.indexOf(t);
      if (idx === -1) {
        t.priority_tag = "flexible";
        t.sort_order = 80 + list.indexOf(t);
        t.slot_start = "";
        t.slot_end = "";
        continue;
      }
      t.sort_order = idx;
      if (idx < 2) t.priority_tag = "must_do";
      else if (idx < 4) t.priority_tag = "suggested";
      else t.priority_tag = "flexible";

      const base = 9 * 60 + idx * 75;
      const end = base + Math.round(Math.max(30, t.hours * 60));
      t.slot_start = toClock(base);
      t.slot_end = toClock(Math.min(23 * 60 + 59, end));
    }
  }
}

function toClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
