/**
 * Best-effort topic lines from pasted PDF/notes when Gemini extraction returned nothing.
 * Picks numbered headings, chapter lines, and short non-sentence lines.
 */
export function inferTopicsFromContextText(
  text: string,
  subject: string,
  taskTitle: string
): string[] {
  const generic = new Set(
    [subject, taskTitle]
      .map((s) => s?.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase())
  );

  const cleaned = text
    .replace(/---\s*Pasted notes\s*---/gi, "")
    .replace(/---\s*Extracted from PDF\s*---/gi, "")
    .trim();

  if (!cleaned) return [];

  const lines = cleaned
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const skipPhrase = new Set([
    "table of contents",
    "contents",
    "index",
    "references",
    "bibliography",
  ]);

  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (s: string) => {
    const t = s.length > 110 ? `${s.slice(0, 107)}...` : s;
    const k = t.toLowerCase();
    if (seen.has(k) || generic.has(k)) return;
    if (skipPhrase.has(k)) return;
    if (/\bquick notes\b|crash course|full notes\b/i.test(t)) return;
    seen.add(k);
    candidates.push(t);
  };

  for (const line of lines) {
    if (candidates.length >= 18) break;
    if (line.length < 10 || line.length > 140) continue;
    const low = line.toLowerCase();
    if (generic.has(low)) continue;

    const num = line.match(
      /^(\d+(?:\.\d+)*)[\.\)]?\s+(.+)$/
    );
    if (num?.[2]) {
      const rest = num[2].trim();
      if (rest.length >= 3 && rest.split(/\s+/).length <= 16) {
        pushUnique(rest);
        continue;
      }
    }

    if (
      /^(chapter|section|unit|part|module|week|lecture)\s+\d+/i.test(line)
    ) {
      pushUnique(line);
      continue;
    }

    const words = line.split(/\s+/).length;
    if (words > 14) continue;
    if (line.endsWith(".") && words > 10) continue;
    if (!line.endsWith(".") && words >= 2 && words <= 12) {
      pushUnique(line);
    }
  }

  if (candidates.length >= 2) return candidates;

  for (const line of lines) {
    if (candidates.length >= 12) break;
    if (line.length < 18 || line.length > 100) continue;
    const words = line.split(/\s+/).length;
    if (words < 3 || words > 14) continue;
    const low = line.toLowerCase();
    if (generic.has(low)) continue;
    pushUnique(line.replace(/\s+/g, " "));
  }

  return candidates.slice(0, 18);
}
