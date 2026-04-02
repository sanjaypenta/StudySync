export const MAX_CONTEXT_CHARS = 28000;

export function truncateContext(text: string, max = MAX_CONTEXT_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[… truncated for length …]`;
}

/** Max characters of merged notes+PDF text returned in API meta for UI preview. */
export const META_MATERIAL_PREVIEW_MAX = 4000;

export function truncateForMetaPreview(
  text: string,
  max = META_MATERIAL_PREVIEW_MAX
): string {
  const t = text.trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n[… truncated for display …]`;
}

export function mergeNotesAndPdfText(
  pdfNotes: string | undefined,
  extractedPdf: string | undefined
): string {
  const parts: string[] = [];
  const notes = pdfNotes?.trim();
  const pdf = extractedPdf?.trim();
  if (notes) {
    parts.push("--- Pasted notes ---\n" + notes);
  }
  if (pdf) {
    parts.push("--- Extracted from PDF ---\n" + pdf);
  }
  return parts.join("\n\n");
}
