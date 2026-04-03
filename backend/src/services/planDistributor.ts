import { inferTopicsFromContextText } from "./topicHeuristics.js";

export type BurnoutLevel = "low" | "medium" | "high";

export type GoalType = "assignment" | "quiz_exam" | "other";

export interface DistributeInput {
  taskTitle: string;
  totalHours: number;
  today: string;
  deadline: string;
  dailyLimit: number;
  burnoutLevel: BurnoutLevel;
  goalType?: GoalType;
  topics?: string;
  /** PDF/notes text for offline topic inference when `topics` is empty */
  contextText?: string;
  subject?: string;
  /** Outline items per day when syllabus batching applies (default 3). */
  topicsPerDay?: number;
}

export interface PlanDay {
  date: string;
  hours: number;
  task: string;
  topics?: string[];
  difficulty?: string;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function round4(n: number): number {
  return Math.round(n * 4) / 4;
}

function effectiveDailyLimit(
  dailyLimit: number,
  burnoutLevel: BurnoutLevel
): number {
  const factor =
    burnoutLevel === "high" ? 0.7 : burnoutLevel === "medium" ? 0.85 : 1;
  return Math.max(0.25, round4(dailyLimit * factor));
}

export function parseTopicLines(topics: string | undefined): string[] {
  if (!topics?.trim()) return [];
  return topics
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function labelForDay(
  dayIndex: number,
  totalDays: number,
  taskTitle: string,
  goalType: GoalType | undefined,
  topicLines: string[]
): string {
  if (goalType === "quiz_exam") {
    const cycle = ["Learning", "Practice", "Revision"] as const;
    const kind = cycle[dayIndex % cycle.length];

    if (topicLines.length === 0) {
      return `${kind}: ${taskTitle} (session ${dayIndex + 1})`;
    }

    if (topicLines.length === 1) {
      const topic = topicLines[0];
      const facets = [
        "concepts",
        "examples",
        "practice",
        "review",
      ] as const;
      const facet = facets[dayIndex % facets.length];
      return `${kind}: ${topic} (${facet})`;
    }

    const topic = topicLines[dayIndex % topicLines.length];
    return `${kind}: ${topic}`;
  }

  const topics =
    topicLines.length > 0 ? topicLines : [taskTitle];
  const topic = topics[dayIndex % topics.length];

  if (goalType === "assignment") {
    return `${taskTitle} — ${topic} (step ${dayIndex + 1}/${totalDays})`;
  }

  if (topicLines.length > 0) {
    return `${taskTitle} — ${topic} (session ${dayIndex + 1}/${totalDays})`;
  }

  return `${taskTitle} — block ${dayIndex + 1}/${totalDays}`;
}

const SYLLABUS_MIN_TOPICS = 5;

/**
 * Batches outline topics (~topicsPerDay per day), then revision-style labels for remaining days.
 */
export function buildSyllabusDayTasks(
  topicLines: string[],
  numDays: number,
  topicsPerDay: number,
  goalType: GoalType | undefined,
  taskTitle: string
): string[] | null {
  if (topicLines.length < SYLLABUS_MIN_TOPICS || numDays < 1) return null;

  const total = topicLines.length;
  const k = Math.max(1, Math.min(20, topicsPerDay));
  let chunkSize = k;
  let learningDaysNeeded = Math.ceil(total / chunkSize);

  if (numDays < learningDaysNeeded) {
    chunkSize = Math.ceil(total / numDays);
    learningDaysNeeded = numDays;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < total; i += chunkSize) {
    chunks.push(topicLines.slice(i, Math.min(i + chunkSize, total)));
  }

  const out: string[] = [];
  for (let d = 0; d < numDays; d++) {
    if (d < chunks.length) {
      const joined = chunks[d].join(" · ");
      if (goalType === "quiz_exam") {
        out.push(`Learning: ${joined}`);
      } else {
        out.push(`${taskTitle} — ${joined}`);
      }
    } else {
      const revNum = d - chunks.length + 1;
      const revTotal = numDays - chunks.length;
      out.push(`Revision: ${taskTitle} (${revNum}/${revTotal})`);
    }
  }
  return out;
}

/**
 * Deterministic fallback: spread hours across today..deadline, cap per day, optional revision slot.
 */
export function distributePlan(input: DistributeInput): PlanDay[] {
  const start = parseYmd(input.today);
  const end = parseYmd(input.deadline);
  if (end < start || input.totalHours <= 0) {
    return [];
  }

  const dates: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    dates.push(formatYmd(d));
  }

  const n = dates.length;
  const cap = effectiveDailyLimit(input.dailyLimit, input.burnoutLevel);
  let remaining = round4(input.totalHours);
  const hours: number[] = new Array(n).fill(0);

  const revisionIdx = n >= 3 ? n - 2 : -1;
  if (revisionIdx >= 0) {
    const rev = Math.min(
      cap,
      Math.max(0.5, round4(remaining * 0.12))
    );
    hours[revisionIdx] = rev;
    remaining = round4(remaining - rev);
  }

  const workIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i !== revisionIdx) workIndices.push(i);
  }
  const m = workIndices.length || 1;
  let per = Math.min(cap, round4(remaining / m));
  for (const i of workIndices) {
    hours[i] = per;
  }
  remaining = round4(remaining - per * workIndices.length);

  let guard = 0;
  while (remaining > 0.001 && guard < 5000) {
    let progressed = false;
    for (const i of workIndices) {
      if (remaining <= 0.001) break;
      const add = Math.min(cap - hours[i], 0.25, remaining);
      if (add > 0) {
        hours[i] = round4(hours[i] + add);
        remaining = round4(remaining - add);
        progressed = true;
      }
    }
    if (!progressed) break;
    guard++;
  }

  let topicLines = parseTopicLines(input.topics);
  if (topicLines.length === 0 && input.contextText?.trim()) {
    topicLines = inferTopicsFromContextText(
      input.contextText,
      input.subject ?? "",
      input.taskTitle
    );
  }

  const gt = input.goalType ?? "other";
  const tpd = Math.max(1, Math.min(20, input.topicsPerDay ?? 3));

  const syllabusTasks =
    topicLines.length >= SYLLABUS_MIN_TOPICS
      ? buildSyllabusDayTasks(topicLines, n, tpd, gt, input.taskTitle)
      : null;

  return dates
    .map((date, i) => ({
      date,
      hours: round4(Math.min(cap, Math.max(0, hours[i]))),
      task:
        syllabusTasks && syllabusTasks[i] !== undefined
          ? syllabusTasks[i]!
          : labelForDay(i, n, input.taskTitle, gt, topicLines),
    }))
    .filter((x) => x.hours > 0);
}
