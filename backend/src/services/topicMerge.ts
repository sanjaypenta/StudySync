import { parseTopicLines } from "./planDistributor.js";

const MAX_MERGED_TOPICS = 40;

/**
 * Removes lines that only repeat the course/subject or task title (case-insensitive).
 * If all lines would be removed, returns `mergedText` unchanged.
 */
export function filterGenericTopicLines(
  mergedText: string,
  subject: string,
  taskTitle: string
): string {
  const lines = parseTopicLines(mergedText);
  if (lines.length === 0) return mergedText;

  const generic = new Set<string>();
  for (const g of [subject, taskTitle]) {
    const t = g?.trim();
    if (t) generic.add(t.toLowerCase());
  }

  const filtered = lines.filter((line) => !generic.has(line.toLowerCase()));
  return filtered.length > 0 ? filtered.join("\n") : mergedText;
}

const BANNER_RE =
  /\bquick notes\b|crash course|complete notes|full notes|pdf notes|study notes only|revision notes\b/i;

/**
 * Drops cover-style lines (e.g. "SOFTWARE ENGINEERING – QUICK NOTES") and
 * "Introduction to {subject}" when finer topics exist.
 */
export function filterBannerLines(
  mergedText: string,
  subject: string
): string {
  const lines = parseTopicLines(mergedText);
  if (lines.length === 0) return mergedText;

  const subLow = subject.trim().toLowerCase();
  const filtered = lines.filter((line) => {
    const low = line.toLowerCase();
    if (BANNER_RE.test(line)) return false;
    if (
      lines.length > 1 &&
      subLow &&
      low.startsWith("introduction to ") &&
      low.includes(subLow)
    ) {
      return false;
    }
    if (
      /^[A-Z][A-Z0-9\s–\-]{6,100}$/.test(line) &&
      line.split(/\s+/).length <= 8 &&
      /\b(NOTES|QUICK|GUIDE|SYLLABUS)\b/.test(line)
    ) {
      return false;
    }
    return true;
  });

  return filtered.length > 0 ? filtered.join("\n") : mergedText;
}

/**
 * User topics first (order preserved), then extracted topics not already present (case-insensitive dedupe).
 */
export function mergeUserTopicsWithExtracted(
  userTopics: string,
  extracted: string[] | null | undefined
): string {
  const user = parseTopicLines(userTopics);
  const seen = new Set(user.map((s) => s.toLowerCase()));
  const out = [...user];

  if (extracted?.length) {
    for (const t of extracted) {
      const trim = t.trim();
      if (!trim) continue;
      const low = trim.toLowerCase();
      if (seen.has(low)) continue;
      seen.add(low);
      out.push(trim);
      if (out.length >= MAX_MERGED_TOPICS) break;
    }
  }

  return out.join("\n");
}
