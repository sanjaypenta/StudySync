import pathlib
p = pathlib.Path(r"e:/StudySync/frontend/src/lib/api.ts")
s = p.read_text(encoding="utf-8")
old = """import { getOrCreateUserId } from \"./userId\";
import type { BurnoutLevel, StudyStyle, UserProfile } from \"./profile\";

const headers = (): HeadersInit => ({
  \"Content-Type\": \"application/json\",
  \"x-user-id\": getOrCreateUserId(),
});"""
new = """import { getToken } from \"./authStorage\";
import type { BurnoutLevel, StudyStyle, UserProfile } from \"./profile\";

export function authHeaders(): HeadersInit {
  const t = getToken();
  const h: Record<string, string> = { \"Content-Type\": \"application/json\" };
  if (t) h[\"Authorization\"] = `Bearer ${t}`;
  return h;
}
"""
if old not in s:
    raise SystemExit("header block not found")
s = s.replace(old, new)
s = s.replace("headers()", "authHeaders()")
# patchServerProfile extend
s = s.replace(
"export type ServerProfile = {\n  userId: string;\n  onboardingComplete: boolean;",
"export type ServerProfile = {\n  userId: string;\n  onboardingComplete: boolean;\n  learnerSummary?: string;\n  interests?: string[];\n  lastBurnoutTip?: string;"
)
# patch patchServerProfile partial type
s = s.replace(
"export async function patchServerProfile(\n  patch: Partial<{\n    onboardingComplete: boolean;",
"export async function patchServerProfile(\n  patch: Partial<{\n    onboardingComplete: boolean;\n    interests?: string[];\n    learnerSummary?: string;"
)
s = s.replace(
"    preferredStudyStyle: StudyStyle;\n  }>\n): Promise<ServerProfile> {\n  const res = await fetch(\"/api/profile\", {\n    method: \"PATCH\",\n    headers: headers(),",
"    preferredStudyStyle: StudyStyle;\n  }>\n): Promise<ServerProfile> {\n  const res = await fetch(\"/api/profile\", {\n    method: \"PATCH\",\n    headers: authHeaders(),"
)
# patch patch uses authHeaders already from replace headers()
# Actually we replaced all headers() with authHeaders() - patchServerProfile might have been headers() -> authHeaders() good

# patchTodo return
patchTodo_old = """export async function patchTodo(
  id: string,
  patch: Partial<
    Pick<
      Todo,
      | \"hours\"
      | \"date\"
      | \"subject\"
      | \"task_title\"
      | \"status\"
      | \"priority_tag\"
      | \"sort_order\"
      | \"slot_start\"
      | \"slot_end\"
    >
  >
): Promise<Todo> {
  const res = await fetch(`/api/todos/${id}`, {
    method: \"PATCH\",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(\"Failed to update\");
  const data = (await res.json()) as { todo: Todo };
  return data.todo;
}"""
patchTodo_new = """export type RewardEvent = {
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
      | \"hours\"
      | \"date\"
      | \"subject\"
      | \"task_title\"
      | \"status\"
      | \"priority_tag\"
      | \"sort_order\"
      | \"slot_start\"
      | \"slot_end\"
    >
  >
): Promise<{ todo: Todo; reward?: RewardEvent }> {
  const res = await fetch(`/api/todos/${id}`, {
    method: \"PATCH\",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(\"Failed to update\");
  const data = (await res.json()) as { todo: Todo; reward?: RewardEvent };
  return { todo: data.todo, reward: data.reward };
}"""
if patchTodo_old not in s:
    raise SystemExit("patchTodo not found")
s = s.replace(patchTodo_old, patchTodo_new)

end_old = """export async function endStudySession(
  id: string,
  outcome: \"completed\" | \"skipped\" | \"abandoned\"
): Promise<void> {
  const res = await fetch(`/api/sessions/${id}/end`, {
    method: \"PATCH\",
    headers: authHeaders(),
    body: JSON.stringify({ outcome }),
  });
  if (!res.ok) throw new Error(\"Could not end session\");
}"""
end_new = """export async function endStudySession(
  id: string,
  outcome: \"completed\" | \"skipped\" | \"abandoned\"
): Promise<{ reward?: RewardEvent; burnoutTip?: string | null }> {
  const res = await fetch(`/api/sessions/${id}/end`, {
    method: \"PATCH\",
    headers: authHeaders(),
    body: JSON.stringify({ outcome }),
  });
  if (!res.ok) throw new Error(\"Could not end session\");
  const data = (await res.json()) as {
    reward?: RewardEvent;
    burnoutTip?: string | null;
  };
  return { reward: data.reward, burnoutTip: data.burnoutTip };
}"""
if end_old not in s:
    raise SystemExit("endStudySession not found")
s = s.replace(end_old, end_new)

# append new API functions before BurnoutPoint
append = """

export async function fetchActiveSession(): Promise<{
  id: string;
  started_at: string;
  todo_ids: string[];
} | null> {
  const res = await fetch(\"/api/sessions/active\", { headers: authHeaders() });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    session: {
      id: string;
      started_at: string;
      todo_ids: string[];
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
  const res = await fetch(\"/api/gamification/state\", { headers: authHeaders() });
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
};

export async function fetchProgressSummary(): Promise<ProgressSummary | null> {
  const res = await fetch(\"/api/progress/summary\", { headers: authHeaders() });
  if (!res.ok) return null;
  return (await res.json()) as ProgressSummary;
}

export async function postLearnerSummary(): Promise<void> {
  const res = await fetch(\"/api/profile/learner-summary\", {
    method: \"POST\",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(\"Failed to generate learner summary\");
}
"""
s = s.replace(
"export type BurnoutPoint = { date: string; score: number; state: string };",
append + "\nexport type BurnoutPoint = { date: string; score: number; state: string };",
)

p.write_text(s, encoding="utf-8")
print("api ok")
