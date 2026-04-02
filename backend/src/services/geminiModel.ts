/**
 * Model ID for @google/generative-ai (Google AI Studio).
 * Env GEMINI_MODEL overrides default (see plan: central prod override).
 */
const fallback = "gemini-2.5-flash";
export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  process.env.GEMINI_TEXT_MODEL?.trim() ||
  fallback;
