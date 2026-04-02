import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_TEXT_MODEL } from "../services/geminiModel.js";
import type { MCQ } from "./types.js";

function extractJsonArray(text: string): string | null {
  const t = text.trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}

function normalizeMcq(raw: unknown): MCQ | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.question !== "string" || !o.question.trim()) return null;
  const opts = o.options;
  if (!Array.isArray(opts) || opts.length !== 4) return null;
  const options = opts.map((x) => String(x).trim()) as [
    string,
    string,
    string,
    string,
  ];
  if (options.some((s) => !s)) return null;
  let answer = String(o.answer ?? "").trim();
  if (!answer) return null;
  const letter = /^[A-D]$/i.test(answer) ? answer.toUpperCase() : null;
  if (letter) {
    const idx = { A: 0, B: 1, C: 2, D: 3 }[letter as "A" | "B" | "C" | "D"];
    if (idx === undefined) return null;
    answer = options[idx];
  }
  if (!options.includes(answer)) return null;
  return { question: o.question.trim(), options, answer };
}

export async function generateQuizMcqs(
  material: string,
  count: number,
  apiKey: string | undefined
): Promise<MCQ[]> {
  const trimmed = material.trim();
  if (!apiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (count < 1 || count > 30) {
    throw new Error("questionsCount must be between 1 and 30");
  }
  if (trimmed.length < 20) {
    throw new Error("Not enough material for a quiz (add topic or file text)");
  }

  const slice = trimmed.slice(0, 14000);
  const prompt = `You are a quiz generator. Create exactly ${count} multiple-choice questions from the material below.

Rules:
- Return ONLY a JSON array (no markdown, no code fences).
- Each element must be: { "question": string, "options": [string, string, string, string], "answer": string }
- "answer" must be EXACTLY the same string as one of the four options (copy the text).
- Questions should be clear and test understanding of the material.

Material:
${slice}

Return ONLY JSON array of ${count} objects.`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = extractJsonArray(text);
  if (!jsonStr) throw new Error("Could not parse quiz JSON from AI");
  const parsed = JSON.parse(jsonStr) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Quiz must be a JSON array");

  const out: MCQ[] = [];
  for (const item of parsed) {
    const m = normalizeMcq(item);
    if (m) out.push(m);
    if (out.length >= count) break;
  }

  if (out.length !== count) {
    throw new Error(
      `Expected ${count} valid questions, got ${out.length}. Try again or adjust material.`
    );
  }
  return out;
}
