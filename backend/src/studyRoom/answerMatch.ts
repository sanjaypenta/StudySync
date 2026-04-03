export function normalizeForAnswerMatch(input: string): string {
  const raw = (input ?? "").toString();
  let s = raw.normalize("NFKC");

  // Normalize whitespace (including NBSP) and trim.
  s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  // Strip wrapping quotes/backticks.
  s = s.replace(/^["'`“”‘’]+/, "").replace(/["'`“”‘’]+$/, "");

  s = s.toLowerCase();

  // Remove trailing punctuation that often differs in MCQ text.
  s = s.replace(/[\.,，。、;；:：!?！？]+$/g, "").trim();

  // Collapse whitespace again after stripping.
  s = s.replace(/\s+/g, " ");
  return s;
}

export function normalizeForQuestionMatch(input: string): string {
  const raw = (input ?? "").toString();
  let s = raw.normalize("NFKC");
  s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");
  s = s.replace(/\s+/g, " ").trim().toLowerCase();
  return s;
}

export function answersEquivalent(a: string, b: string): boolean {
  const na = normalizeForAnswerMatch(a);
  const nb = normalizeForAnswerMatch(b);
  return na.length > 0 && nb.length > 0 ? na === nb : na === nb;
}
