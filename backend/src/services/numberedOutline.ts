/**
 * Extracts top-level numbered section titles (e.g. "1. Introduction …") from notes/PDF text.
 * Skips nested "1." restarts under a section (e.g. models under "3. SDLC Models").
 */
const BANNER_RE =
  /\bquick notes\b|crash course|full notes\b|pdf notes\b/i;

const STOP_SECTION_RE = /important exam questions|sample questions|references\b/i;

function cleanTitle(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  if (t.length > 120) t = `${t.slice(0, 117)}...`;
  return t;
}

export function extractNumberedOutlineLines(text: string): string[] {
  const lines = text.split(/\n+/);
  const out: string[] = [];
  let prev = 0;

  for (const line of lines) {
    const trimmed = line.replace(/\r$/, "").trim();
    if (!trimmed) continue;
    if (STOP_SECTION_RE.test(trimmed)) break;

    const m = trimmed.match(/^\s*(\d+)\.\s+(.+)$/);
    if (!m) continue;

    const num = parseInt(m[1], 10);
    if (!Number.isFinite(num) || num < 1 || num > 200) continue;

    let title = cleanTitle(m[2]);
    if (title.length < 3) continue;
    if (BANNER_RE.test(title)) continue;

    if (prev === 0) {
      out.push(title);
      prev = num;
      continue;
    }

    if (num < prev + 1) {
      continue;
    }

    if (num === prev + 1) {
      out.push(title);
      prev = num;
    }
  }

  return out.slice(0, 40);
}
