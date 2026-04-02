import type { ITodo } from "../models/Todo.js";
import type { IUserProfile } from "../models/UserProfileDoc.js";
import { Todo } from "../models/Todo.js";
import { UserProfileModel } from "../models/UserProfileDoc.js";
import { BurnoutDaily } from "../models/BurnoutDaily.js";
import { applyDailyPrioritization } from "./dailyPrioritize.js";

const MAX_FORWARD_DAYS = 21;

function addDaysYmd(ymd: string, delta: number): string {
  const d = new Date(ymd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function ymdCompare(a: string, b: string): number {
  return a.localeCompare(b);
}

export function effectiveDailyCap(profile: IUserProfile | null): number {
  const base = profile?.dailyStudyHoursLimit ?? 4;
  const bl = profile?.burnoutLevel ?? "medium";
  const factor =
    bl === "high" ? 0.7 : bl === "medium" ? 0.85 : 1;
  const n = base * factor;
  return Math.max(0.25, Math.round(n * 4) / 4);
}

export type AutoRescueResult = {
  ok: boolean;
  moved: number;
  summary: {
    fromDates: string[];
    toRange: [string, string] | null;
  };
  message: string;
  toastTitle: string;
  toastSubtitle: string;
};

const SUBTITLES = [
  "Skipping a day doesn't erase progress — we reshuffled what's left.",
  "Your plan now starts from today; take it one block at a time.",
  "No guilt here. We spread the load across lighter days.",
  "Life happens. Your tasks are back on track for the days ahead.",
];

function pickSubtitle(userId: string, today: string): string {
  let h = 0;
  const s = `${userId}:${today}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return SUBTITLES[Math.abs(h) % SUBTITLES.length];
}

/**
 * Move overdue pending todos (date < today) forward onto today..today+N
 * without splitting rows; respects per-day hour caps using profile limits.
 */
export function assignRescueDates(
  overdue: ITodo[],
  dayLoad: Map<string, number>,
  today: string,
  dailyCap: number
): Map<string, string> {
  const moves = new Map<string, string>();
  const sorted = [...overdue].sort((a, b) => {
    const c = a.date.localeCompare(b.date);
    return c !== 0 ? c : a.sort_order - b.sort_order;
  });

  for (const t of sorted) {
    const id = String(t._id);
    for (let i = 0; i <= MAX_FORWARD_DAYS; i++) {
      const d = addDaysYmd(today, i);
      const cur = dayLoad.get(d) ?? 0;
      const next = cur + t.hours;
      if (next <= dailyCap || i === MAX_FORWARD_DAYS) {
        t.date = d;
        dayLoad.set(d, next);
        moves.set(id, d);
        break;
      }
    }
  }
  return moves;
}

export function buildAutoRescueToast(
  userId: string,
  today: string,
  moved: number,
  fromDates: string[],
  toRange: [string, string] | null
): Pick<AutoRescueResult, "message" | "toastTitle" | "toastSubtitle"> {
  const toastTitle =
    moved === 0
      ? "Nothing to adjust"
      : "Don't worry — we've adjusted your plan";
  const toastSubtitle =
    moved === 0
      ? "You're all caught up on past dates."
      : pickSubtitle(userId, today);
  let message = toastSubtitle;
  if (moved > 0 && toRange) {
    const uniq = [...new Set(fromDates)].sort(ymdCompare);
    message = `Moved ${moved} task${moved === 1 ? "" : "s"} from ${uniq.slice(0, 3).join(", ")}${uniq.length > 3 ? "…" : ""} into ${toRange[0]}–${toRange[1]}.`;
  }
  return { message, toastTitle, toastSubtitle };
}

export async function runAutoRescue(
  userId: string,
  horizonDays: number
): Promise<AutoRescueResult> {
  const today = new Date().toISOString().slice(0, 10);
  const span = Math.max(MAX_FORWARD_DAYS, Math.min(42, horizonDays || 14));
  const rangeEnd = addDaysYmd(today, span);

  const profile = await UserProfileModel.findOne({ user_id: userId });
  const dailyCap = effectiveDailyCap(profile);

  const overdue = await Todo.find({
    user_id: userId,
    status: "pending",
    date: { $lt: today },
  }).sort({ date: 1, sort_order: 1 });

  if (overdue.length === 0) {
    const empty = buildAutoRescueToast(userId, today, 0, [], null);
    return {
      ok: true,
      moved: 0,
      summary: { fromDates: [], toRange: null },
      ...empty,
    };
  }

  const fromDates = overdue.map((t) => t.date);

  const futurePending = await Todo.find({
    user_id: userId,
    status: "pending",
    date: { $gte: today, $lte: rangeEnd },
  });

  const dayLoad = new Map<string, number>();
  for (const t of futurePending) {
    dayLoad.set(t.date, (dayLoad.get(t.date) ?? 0) + t.hours);
  }

  assignRescueDates(overdue, dayLoad, today, dailyCap);

  const newDates = overdue.map((t) => t.date);
  const minNew = newDates.reduce((a, b) => (ymdCompare(a, b) < 0 ? a : b));
  const maxNew = newDates.reduce((a, b) => (ymdCompare(a, b) > 0 ? a : b));
  const toRange: [string, string] = [minNew, maxNew];

  await Promise.all(overdue.map((t) => t.save()));

  const y = new Date(today + "T12:00:00Z");
  y.setUTCDate(y.getUTCDate() - 1);
  const yStr = y.toISOString().slice(0, 10);
  const prev = await BurnoutDaily.findOne({
    user_id: userId,
    date: yStr,
  });
  let maxPerDay = 6;
  if (prev?.state === "red") maxPerDay = 2;
  else if (prev?.state === "yellow") maxPerDay = 4;

  const toPrioritize = await Todo.find({
    user_id: userId,
    date: { $gte: today, $lte: rangeEnd },
  }).sort({ date: 1, sort_order: 1 });

  applyDailyPrioritization(toPrioritize, { maxPerDay });
  await Promise.all(toPrioritize.map((t) => t.save()));

  const toast = buildAutoRescueToast(
    userId,
    today,
    overdue.length,
    fromDates,
    toRange
  );

  return {
    ok: true,
    moved: overdue.length,
    summary: {
      fromDates: [...new Set(fromDates)].sort(ymdCompare),
      toRange,
    },
    ...toast,
  };
}
