import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  distributePlan,
  parseTopicLines,
  type BurnoutLevel,
  type GoalType,
  type PlanDay,
} from "./planDistributor.js";
import {
  filterBannerLines,
  filterGenericTopicLines,
  mergeUserTopicsWithExtracted,
} from "./topicMerge.js";
import { extractTopicsFromMaterial } from "./topicExtraction.js";
import { inferTopicsFromContextText } from "./topicHeuristics.js";
import { extractNumberedOutlineLines } from "./numberedOutline.js";
import { GEMINI_TEXT_MODEL } from "./geminiModel.js";

export interface GeneratePlanInput {
  taskTitle: string;
  subject: string;
  totalHours: number;
  deadline: string;
  today: string;
  dailyLimit: number;
  burnoutLevel: BurnoutLevel;
  preferredStudyStyle: "light" | "intense";
  goalType: GoalType;
  topics: string;
  contextText: string;
  /** Batched outline items per study day when syllabus mode applies (default 3). */
  topicsPerDay: number;
}

/** Input with merged user + PDF-derived topics for prompting and fallback. */
export type SchedulePlanInput = GeneratePlanInput & {
  effectiveTopics: string;
};

function pickExtractedTopics(
  numbered: string[],
  extracted: string[] | null | undefined
): string[] | null {
  /** Gemini often returns dozens of bullet fragments; numbered outline wins for syllabi. */
  if (numbered.length >= 5) {
    return numbered;
  }
  const ex = extracted?.length ? extracted : null;
  if (ex) return ex;
  if (numbered.length > 0) return numbered;
  return null;
}

function escapeForPrompt(s: string): string {
  return s.replace(/```/g, "'''");
}

function buildPrompt(input: SchedulePlanInput): string {
  const ctx = input.contextText.trim()
    ? `\n\nReference material (notes and/or PDF text):\n${escapeForPrompt(input.contextText)}\n`
    : "";

  const hasRef = Boolean(input.contextText.trim());
  const outlineSection = input.effectiveTopics.trim()
    ? `Combined topic outline (user topics + topics inferred from PDF/notes when available). Schedule in this order where sensible:\n${escapeForPrompt(input.effectiveTopics)}\n`
    : "";

  const topicLineCount = parseTopicLines(input.effectiveTopics).length;
  const tpd = Math.max(1, Math.min(20, input.topicsPerDay));
  const learningDaysHint =
    topicLineCount >= 1 ? Math.ceil(topicLineCount / tpd) : 0;

  const syllabusBlock =
    topicLineCount >= 5
      ? `
SYLLABUS MODE (N=${topicLineCount} outline items, ~${tpd} items per study day):
- Cover **each outline item exactly once**, in order, across the date range before generic revision-only days.
- Put about **${tpd}** outline items in each **new-material** day's "task" string (separate with " · " or commas), e.g. "Learning: Unit A · Unit B · Unit C" or "${input.taskTitle} — Unit A · Unit B · Unit C".
- The first **${learningDaysHint}** calendar day(s) (or fewer if the deadline window is shorter) carry **new material**; **remaining** days until ${input.deadline} are **revision** (label with "Revision: …", mixed review, or exam practice) — do **not** repeat the first outline items again on those revision days.
- Do **not** use placeholders like "block i/j" or only the subject name.
`
      : "";

  const spreadRules = hasRef
    ? `Reference-driven spread:
- Infer major units (chapters, sections, concepts) from the reference material above.
- Spread those units across ${input.today} through ${input.deadline}: each calendar day should focus on a specific unit or combination, not repeat the task title alone.
- Avoid assigning the same primary topic on consecutive days unless total hours require it.
- Each day's "task" must name the topic or unit being covered that day (short label).`
    : "";

  const goalRules =
    input.goalType === "assignment"
      ? `Goal type: ASSIGNMENT
- Break the work into ordered milestones across days using the topic outline and reference material.
- Each day's "task" must name a concrete chunk (section, milestone), not only the assignment title.`
      : input.goalType === "quiz_exam"
        ? `Goal type: QUIZ / EXAM PREP
- Mix learning, practice, and revision across the date range.
- **Do not** use only the Subject line or task title as the topic phrase in every row. Each "task" must name a **specific concept** from the merged outline and/or reference material (e.g. chapter/concept names), not the generic course name on repeat.
- Each day's "task" should look like "Learning: [concept]", "Practice: [concept]", "Revision: [concept]" using **distinct** concept names across days where possible.
- If there are **few days** or **little time per day**, you may combine activities in **one** "task" string for a single day, e.g. "Revision: [concept A] + Learning: [concept B]".
- Vary the primary concept from day to day; avoid the same concept on consecutive days unless the schedule is very short.`
        : `Goal type: OTHER
- Each day's "task" must name a **specific unit** from the merged topic outline and/or reference material (chapter, section, or concept title — e.g. "Introduction", "Requirements").
- Do **not** use generic placeholders like "block 1/N" or only the subject name; vary labels across days when the outline lists multiple items.`;

  return `You are an AI study planner. Return ONLY valid JSON array (no markdown, no code fences).

Task title: ${escapeForPrompt(input.taskTitle)}
Subject: ${escapeForPrompt(input.subject)}
${outlineSection}${ctx}
Total Hours: ${input.totalHours}
Deadline: ${input.deadline}
Today's Date: ${input.today}

User Profile:
- Max Study Hours Per Day: ${input.dailyLimit}
- Burnout Level: ${input.burnoutLevel}
- Preferred Study Style: ${input.preferredStudyStyle}

Planning rules:
${goalRules}

${spreadRules}
${syllabusBlock}

General rules:
- Distribute study hours across calendar days from ${input.today} through ${input.deadline} (inclusive).
- Do not exceed ${input.dailyLimit} hours on any single day.
- If burnout level is high, use lighter daily loads.
- Use 0.25 hour increments.
- Each array element's "task" must be a short label for that day (specific concept or chapter from the outline/material — **not** the subject field repeated for every day).
- Do **not** use placeholder text like "(focus 1)" or generic "session 1" — use real topic or section names from the material.

Return ONLY JSON in this exact format:
[
  { "date": "YYYY-MM-DD", "hours": 1, "task": "specific label for that day" }
]`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validatePlanDays(
  raw: unknown,
  input: GeneratePlanInput
): PlanDay[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PlanDay[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    if (typeof o.date !== "string" || !DATE_RE.test(o.date)) return null;
    if (typeof o.hours !== "number" || !Number.isFinite(o.hours)) return null;
    if (o.hours < 0 || o.hours > input.dailyLimit + 1e-6) return null;
    if (typeof o.task !== "string" || !o.task.trim()) return null;
    out.push({
      date: o.date,
      hours: Math.round(o.hours * 4) / 4,
      task: o.task.trim(),
    });
  }
  return out;
}

export function extractJsonArray(text: string): string | null {
  const t = text.trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}

export interface PlanGenerationOutput {
  plan: PlanDay[];
  /** Merged topic outline used for prompts and fallback (user + PDF-derived). */
  effectiveTopics: string;
}

export async function generatePlanWithGemini(
  input: GeneratePlanInput,
  apiKey: string | undefined
): Promise<PlanGenerationOutput> {
  const numbered = extractNumberedOutlineLines(input.contextText);

  let extracted: string[] | null = null;
  if (numbered.length < 5) {
    extracted = await extractTopicsFromMaterial(
      input.contextText,
      apiKey
    );
    if (!extracted?.length && input.contextText.trim().length >= 40) {
      const inferred = inferTopicsFromContextText(
        input.contextText,
        input.subject,
        input.taskTitle
      );
      if (inferred.length) {
        extracted = inferred;
      }
    }
  }

  const picked = pickExtractedTopics(numbered, extracted);
  const merged = mergeUserTopicsWithExtracted(input.topics, picked);
  const withoutGeneric = filterGenericTopicLines(
    merged,
    input.subject,
    input.taskTitle
  );
  const effectiveTopics = filterBannerLines(withoutGeneric, input.subject);

  const scheduleInput: SchedulePlanInput = {
    ...input,
    effectiveTopics,
  };

  const fallback = (): PlanGenerationOutput => ({
    plan: distributePlan({
      taskTitle: input.taskTitle,
      totalHours: input.totalHours,
      today: input.today,
      deadline: input.deadline,
      dailyLimit: input.dailyLimit,
      burnoutLevel: input.burnoutLevel,
      goalType: input.goalType,
      topics: effectiveTopics,
      contextText: input.contextText,
      subject: input.subject,
      topicsPerDay: input.topicsPerDay,
    }),
    effectiveTopics,
  });

  const syllabusDeterministic = numbered.length >= 5;

  if (!apiKey?.trim() || syllabusDeterministic) {
    return fallback();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const result = await model.generateContent(buildPrompt(scheduleInput));
    const text = result.response.text();
    const jsonStr = extractJsonArray(text);
    if (!jsonStr) {
      return fallback();
    }
    const parsed = JSON.parse(jsonStr) as unknown;
    const validated = validatePlanDays(parsed, input);
    if (!validated || validated.length === 0) {
      return fallback();
    }
    return { plan: validated, effectiveTopics };
  } catch {
    return fallback();
  }
}
