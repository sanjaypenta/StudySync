import { GoogleGenerativeAI } from "@google/generative-ai";
import { truncateContext } from "./contextMerge.js";
import { GEMINI_TEXT_MODEL } from "./geminiModel.js";

const MIN_MATERIAL_CHARS = 300;
/** Budget for the extraction prompt (material slice). */
const EXTRACTION_MATERIAL_MAX = 12000;
const MAX_TOPICS = 20;

function extractJsonArray(text: string): string | null {
  const t = text.trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}

function normalizeExtracted(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const s = item.trim();
    if (!s) continue;
    const short = s.length > 120 ? s.slice(0, 117) + "..." : s;
    const low = short.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(short);
    if (out.length >= MAX_TOPICS) break;
  }
  return out.length > 0 ? out : null;
}

/**
 * Second Gemini call: outline topics from PDF/notes text. Returns null on skip or failure.
 */
export async function extractTopicsFromMaterial(
  contextText: string,
  apiKey: string | undefined
): Promise<string[] | null> {
  const trimmed = contextText.trim();
  if (!apiKey?.trim() || trimmed.length < MIN_MATERIAL_CHARS) {
    return null;
  }

  const material = truncateContext(trimmed, EXTRACTION_MATERIAL_MAX);

  const prompt = `Extract a study outline from the material below. Return ONLY a JSON array of strings (no markdown, no code fences).

Rules:
- Prefer **specific unit names**: chapter/section titles as they appear in the text (e.g. "Introduction to …", "Unit 2: Requirements", "Agile manifesto", "Waterfall vs iterative") — **not** the cover/course banner alone.
- When the material has numbered units or headings, **include those labels verbatim** where useful (including "Introduction" chapters).
- Skip cover lines like "QUICK NOTES", "FULL NOTES", or the document filename if they appear as headings.
- When the material is long enough, output **at least 5** distinct items (up to 20), in reading order.
- Each string under 120 characters; no duplicates.
- Do **not** output only broad titles that repeat the subject; split into smaller teachable units when possible.
- If the text is sparse, return as many real units as you can find (minimum 1).

Material:
${material}

Return ONLY JSON in this form:
["Topic 1", "Topic 2"]`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = extractJsonArray(text);
    if (!jsonStr) return null;
    const parsed = JSON.parse(jsonStr) as unknown;
    return normalizeExtracted(parsed);
  } catch {
    return null;
  }
}
