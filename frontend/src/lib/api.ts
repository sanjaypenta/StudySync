import { getToken } from "./authStorage";
import type { SessionMood } from "./sessionBreakPolicy";
import type { BurnoutLevel, StudyStyle, UserProfile } from "./profile";

export function authHeaders(): HeadersInit {
  const t = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

export async function forgotPassword(email: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, newPassword }),
  });
  if (!res.ok) throw new Error("Failed to request password reset");
  return res.json();
}


export type DayBlockDto = {
  type: "wake" | "class" | "meal" | "free" | "sleep" | "other";
  label: string;
  start: string;
  end: string;
};

export type ServerProfile = {
  userId: string;
  onboardingComplete: boolean;
  learnerSummary?: string;
  interests?: string[];
  lastBurnoutTip?: string;
  screenTime: { mobileHours: number; laptopHours: number };
  studyMode: "self" | "group";
  wakeTime: string;
  sleepTime: string;
  dayBlocks: DayBlockDto[];
  dailyStudyHoursLimit: number;
  burnoutLevel: BurnoutLevel;
  preferredStudyStyle: StudyStyle;
  sleepQuality?: "poor" | "ok" | "good";
  stressFactors?: string[];
  weeklyStudyHoursTarget?: number;
};

export async function fetchServerProfile(): Promise<
  ServerProfile | null | "error"
> {
  let res: Response;
  try {
    res = await fetch("/api/profile", { headers: authHeaders() });
  } catch {
    return "error";
  }
  if (res.status === 503) return null;
  if (!res.ok) return "error";
  const data = (await res.json()) as { profile: ServerProfile };
  return data.profile;
}

export async function patchServerProfile(
  patch: Partial<{
    onboardingComplete: boolean;
    interests?: string[];
    learnerSummary?: string;
    screenTime: { mobileHours: number; laptopHours: number };
    studyMode: "self" | "group";
    wakeTime: string;
    sleepTime: string;
    dayBlocks: DayBlockDto[];
    dailyStudyHoursLimit: number;
    burnoutLevel: BurnoutLevel;
    preferredStudyStyle: StudyStyle;
    sleepQuality?: "poor" | "ok" | "good";
    stressFactors?: string[];
    weeklyStudyHoursTarget?: number;
  }>
): Promise<ServerProfile> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Profile update failed");
  }
  const data = (await res.json()) as { profile: ServerProfile };
  return data.profile;
}

export type GoalType = "assignment" | "quiz_exam" | "other";

export interface PlanDay {
  date: string;
  hours: number;
  task: string;
}

export interface GeneratePlanMeta {
  pdfUploaded: boolean;
  pdfCharsExtracted: number;
  contextChars: number;
  pdfNote?: string;
  /** Truncated notes + PDF text the planner received (for verification). */
  materialTextPreview?: string;
  /** Topic outline string used for scheduling (user + extracted lines). */
  effectiveTopics?: string;
}

export interface GeneratePlanResult {
  plan: PlanDay[];
  meta: GeneratePlanMeta;
}

export type PriorityTag = "must_do" | "suggested" | "flexible";
export type TodoStatus = "pending" | "completed" | "skipped";

export interface Todo {
  id: string;
  user_id: string;
  task_title: string;
  subject: string;
  date: string;
  hours: number;
  status: TodoStatus;
  priority_tag: PriorityTag;
  sort_order: number;
  slot_start: string;
  slot_end: string;
}

export async function generatePlan(body: {
  taskTitle: string;
  subject: string;
  totalHours: number;
  deadline: string;
  today: string;
  profile: UserProfile;
  goalType: GoalType;
  topics: string;
  pdfNotes: string;
  pdfFile: File | null;
  /** Group ~N outline items per study day when the syllabus is long (default 3). */
  topicsPerDay?: number;
}): Promise<GeneratePlanResult> {
  const fd = new FormData();
  fd.append("taskTitle", body.taskTitle);
  fd.append("subject", body.subject);
  fd.append("totalHours", String(body.totalHours));
  fd.append("deadline", body.deadline);
  fd.append("today", body.today);
  fd.append("dailyLimit", String(body.profile.dailyStudyHoursLimit));
  fd.append("burnoutLevel", body.profile.burnoutLevel);
  fd.append("preferredStudyStyle", body.profile.preferredStudyStyle);
  fd.append("goalType", body.goalType);
  fd.append("topics", body.topics);
  fd.append("pdfNotes", body.pdfNotes);
  fd.append("topicsPerDay", String(body.topicsPerDay ?? 3));
  if (body.pdfFile) {
    fd.append("pdf", body.pdfFile);
  }

  let res: Response;
  try {
    res = await fetch("/api/plans/generate", {
      method: "POST",
      body: fd,
    });
  } catch {
    throw new Error(
      "Cannot reach the API. Start the backend (npm run dev from the repo root) and ensure it listens on port 4000."
    );
  }
  const raw = await res.text();
  let parsed: {
    plan?: PlanDay[];
    meta?: GeneratePlanMeta;
    error?: string;
  } = {};
  try {
    parsed = JSON.parse(raw) as {
      plan?: PlanDay[];
      meta?: GeneratePlanMeta;
      error?: string;
    };
  } catch {
    if (!res.ok) {
      throw new Error(
        res.status === 0 || res.status >= 500
          ? "Cannot reach the API. Is the backend running on port 4000? (npm run dev from the repo root)"
          : `Request failed (${res.status})`
      );
    }
    throw new Error("Invalid response from server");
  }
  if (!res.ok) {
    throw new Error(
      parsed.error ?? `Failed to generate plan (${res.status})`
    );
  }
  if (!parsed.plan || !Array.isArray(parsed.plan)) {
    throw new Error("Invalid plan response from server");
  }
  const meta: GeneratePlanMeta = parsed.meta ?? {
    pdfUploaded: false,
    pdfCharsExtracted: 0,
    contextChars: 0,
    materialTextPreview: undefined,
    effectiveTopics: undefined,
  };
  return { plan: parsed.plan, meta };
}

export async function previewPdfExtract(file: File): Promise<{
  preview: string;
  charCount: number;
}> {
  const fd = new FormData();
  fd.append("pdf", file);
  let res: Response;
  try {
    res = await fetch("/api/plans/extract-preview", {
      method: "POST",
      body: fd,
    });
  } catch {
    throw new Error(
      "Cannot reach the API. Start the backend (npm run dev from the repo root)."
    );
  }
  const raw = await res.text();
  let parsed: { preview?: string; charCount?: number; error?: string } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    if (!res.ok) {
      throw new Error("Could not extract PDF text");
    }
    throw new Error("Invalid response from server");
  }
  if (!res.ok) {
    throw new Error(parsed.error ?? "Extract failed");
  }
  if (typeof parsed.preview !== "string" || typeof parsed.charCount !== "number") {
    throw new Error("Invalid extract response");
  }
  return { preview: parsed.preview, charCount: parsed.charCount };
}

export async function bulkCreateTodos(
  items: Array<{
    task_title: string;
    subject: string;
    date: string;
    hours: number;
  }>
): Promise<Todo[]> {
  const res = await fetch("/api/todos/bulk", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ todos: items }),
  });
  const raw = await res.text();
  let parsed: { todos?: Todo[]; error?: string } = {};
  try {
    parsed = JSON.parse(raw) as { todos?: Todo[]; error?: string };
  } catch {
    if (!res.ok) {
      throw new Error(
        res.status === 503
          ? "Database unavailable. Start MongoDB and check backend/.env."
          : "Failed to save tasks."
      );
    }
    throw new Error("Invalid response from server");
  }
  if (!res.ok) {
    throw new Error(
      parsed.error ??
        (res.status === 503
          ? "Database unavailable. Start MongoDB and check backend/.env."
          : "Failed to save tasks.")
    );
  }
  if (!parsed.todos || !Array.isArray(parsed.todos)) {
    throw new Error("Invalid save response");
  }
  return parsed.todos;
}

export async function fetchTodosRange(
  from: string,
  to: string
): Promise<Todo[]> {
  const q = new URLSearchParams({ from, to });
  const res = await fetch(`/api/todos?${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load todos");
  const data = (await res.json()) as { todos: Todo[] };
  return data.todos;
}

export async function fetchTodosForDate(date: string): Promise<Todo[]> {
  const q = new URLSearchParams({ date });
  const res = await fetch(`/api/todos?${q}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load todos");
  const data = (await res.json()) as { todos: Todo[] };
  return data.todos;
}

export type DnaStrengthLevel = "strong" | "steady" | "needs";

export type DnaStrengthRow = {
  subject: string;
  score: number;
  level: DnaStrengthLevel;
};

export type StudyDnaSummary = {
  status: "learning" | "active";
  lastUpdated: string;
  confidence: number;
  peakProductivity: {
    label: string;
    range: string;
  };
  focusDurationMinutes: number;
  burnoutPattern: {
    note: string;
    risk: "green" | "yellow" | "red";
  };
  energyBehavior: {
    note: string;
    trend: number[];
  };
  consistency: {
    daysPerWeek: number;
    score: number;
  };
  strengths: DnaStrengthRow[];
  smartInsights: string[];
};

export async function fetchStudyDnaSummary(): Promise<StudyDnaSummary> {
  const res = await fetch("/api/study-dna/summary", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load study DNA");
  const data = (await res.json()) as { summary?: StudyDnaSummary };
  if (!data.summary) throw new Error("Invalid study DNA response");
  return data.summary;
}

export async function rebalanceTodos(
  date: string,
  orderedIds: string[]
): Promise<Todo[]> {
  const res = await fetch("/api/todos/rebalance", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ date, orderedIds }),
  });
  const raw = await res.text();
  let parsed: { todos?: Todo[]; error?: string } = {};
  try {
    parsed = JSON.parse(raw) as { todos?: Todo[]; error?: string };
  } catch {
    if (!res.ok) throw new Error("Rebalance failed");
    throw new Error("Invalid response");
  }
  if (!res.ok) {
    throw new Error(parsed.error ?? "Rebalance failed");
  }
  if (!parsed.todos) throw new Error("Invalid rebalance response");
  return parsed.todos;
}

export type AutoRescueResponse = {
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

export async function postAutoRescue(horizonDays = 14): Promise<AutoRescueResponse> {
  const res = await fetch("/api/todos/rescue", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ horizonDays }),
  });
  const raw = await res.text();
  let parsed: AutoRescueResponse & { error?: string } = {} as AutoRescueResponse;
  try {
    parsed = JSON.parse(raw) as AutoRescueResponse & { error?: string };
  } catch {
    if (!res.ok) throw new Error("Rescue failed");
    throw new Error("Invalid response");
  }
  if (!res.ok) {
    throw new Error(parsed.error ?? "Rescue failed");
  }
  return parsed;
}

export async function prioritizeTodos(
  from: string,
  to: string
): Promise<Todo[]> {
  const res = await fetch("/api/todos/prioritize", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ from, to }),
  });
  const raw = await res.text();
  let parsed: { todos?: Todo[]; error?: string } = {};
  try {
    parsed = JSON.parse(raw) as { todos?: Todo[]; error?: string };
  } catch {
    if (!res.ok) throw new Error("Prioritize failed");
    throw new Error("Invalid response");
  }
  if (!res.ok) {
    throw new Error(parsed.error ?? "Prioritize failed");
  }
  if (!parsed.todos) throw new Error("Invalid prioritize response");
  return parsed.todos;
}

export type RewardEvent = {
  pointsEarned: number;
  pointsTotal: number;
  streakAfter: number;
  longestStreak: number;
  tierBefore: string;
  tierAfter: string;
  milestones: string[];
};

export async function patchTodo(
  id: string,
  patch: Partial<
    Pick<
      Todo,
      | "hours"
      | "date"
      | "subject"
      | "task_title"
      | "status"
      | "priority_tag"
      | "sort_order"
      | "slot_start"
      | "slot_end"
    >
  >
): Promise<{ todo: Todo; reward?: RewardEvent }> {
  const res = await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update");
  const data = (await res.json()) as { todo: Todo; reward?: RewardEvent };
  return { todo: data.todo, reward: data.reward };
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todos/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete");
}

export async function startStudySession(
  todoIds: string[],
  options?: { mood?: SessionMood }
): Promise<{
  id: string;
  started_at: string;
}> {
  const res = await fetch("/api/sessions/start", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      todoIds,
      ...(options?.mood ? { mood: options.mood } : {}),
    }),
  });
  if (!res.ok) throw new Error("Could not start session");
  const data = (await res.json()) as {
    session: { id: string; started_at: string };
  };
  return data.session;
}

export type { SessionMood } from "./sessionBreakPolicy";

export async function endStudySession(
  id: string,
  outcome: "completed" | "skipped" | "abandoned"
): Promise<{ reward?: RewardEvent; burnoutTip?: string | null }> {
  const res = await fetch(`/api/sessions/${id}/end`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ outcome }),
  });
  if (!res.ok) throw new Error("Could not end session");
  const data = (await res.json()) as {
    reward?: RewardEvent;
    burnoutTip?: string | null;
  };
  return { reward: data.reward, burnoutTip: data.burnoutTip };
}

export async function pauseStudySession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}/pause`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Could not pause session");
}

export async function resumeStudySession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${id}/resume`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Could not resume session");
}



export async function fetchActiveSession(): Promise<{
  id: string;
  started_at: string;
  todo_ids: string[];
  session_mood: SessionMood | null;
  pauses: { started_at: string; ended_at: string | null }[];
} | null> {
  const res = await fetch("/api/sessions/active", { headers: authHeaders() });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    session: {
      id: string;
      started_at: string;
      todo_ids: string[];
      session_mood: SessionMood | null;
      pauses: { started_at: string; ended_at: string | null }[];
    } | null;
  };
  return data.session;
}

export type GamificationState = {
  streak: { current: number; longest: number };
  points: number;
  tier: string;
  burnout: { state: string; label: string; score?: number };
  energyPercent: number;
};

export async function fetchGamificationState(): Promise<GamificationState | null> {
  const res = await fetch("/api/gamification/state", { headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as GamificationState;
}

export type ProgressSummary = {
  streak: { current: number; longest: number };
  points: number;
  tier: string;
  todosCompleted: number;
  focusMinutesTotal: number;
  burnout: {
    today: { score: number; state: string } | null;
    last7: { date: string; score: number; state: string }[];
  };
  learnerSummary: string;
  lastBurnoutTip: string;
  dna?: {
    insights: {
      bestTime: string;
      avgFocus: number;
      weakSubject: string;
      burnoutPattern: string;
    };
    radar: {
      subject: string;
      A: number;
      fullMark: number;
    }[];
  };
};

export async function fetchProgressSummary(): Promise<ProgressSummary | null> {
  const res = await fetch("/api/progress/summary", { headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as ProgressSummary;
}

export async function postLearnerSummary(): Promise<void> {
  const res = await fetch("/api/profile/learner-summary", {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to generate learner summary");
}

export type BurnoutPoint = { date: string; score: number; state: string };

export async function recalculateWellbeing(): Promise<void> {
  const res = await fetch("/api/wellbeing/recalculate", {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 503) throw new Error("Wellbeing");
}

export async function fetchWellbeingHistory(
  days = 7
): Promise<BurnoutPoint[]> {
  const res = await fetch(
    `/api/wellbeing/history?days=${days}`,
    { headers: authHeaders() }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { points: BurnoutPoint[] };
  return data.points ?? [];
}

export async function fetchWellbeingIntervention(): Promise<{
  level: string;
  score?: number;
  message: string;
}> {
  const res = await fetch("/api/wellbeing/intervention", { headers: authHeaders() });
  if (!res.ok) return { level: "unknown", message: "" };
  return (await res.json()) as {
    level: string;
    score?: number;
    message: string;
  };
}
