import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeNotesAndPdfText,
  truncateContext,
  truncateForMetaPreview,
  MAX_CONTEXT_CHARS,
  META_MATERIAL_PREVIEW_MAX,
} from "./contextMerge.js";

test("truncateContext caps length", () => {
  const long = "a".repeat(MAX_CONTEXT_CHARS + 100);
  const t = truncateContext(long);
  assert.ok(t.length <= MAX_CONTEXT_CHARS + 80);
  assert.ok(t.includes("truncated"));
});

test("truncateForMetaPreview caps UI preview length", () => {
  const long = "x".repeat(META_MATERIAL_PREVIEW_MAX + 50);
  const t = truncateForMetaPreview(long);
  assert.ok(t.includes("truncated for display"));
  assert.ok(t.length < long.length);
});

test("mergeNotesAndPdfText combines sections", () => {
  const m = mergeNotesAndPdfText("note A", "pdf B");
  assert.ok(m.includes("Pasted notes"));
  assert.ok(m.includes("note A"));
  assert.ok(m.includes("Extracted from PDF"));
  assert.ok(m.includes("pdf B"));
});
