/**
 * Model ID for @google/generative-ai (Google AI Studio).
 * Env GEMINI_MODEL overrides default.
 *
 * Free-tier quotas (requests per day):
 *   gemini-1.5-flash  → 1,500 RPD  ← default (high quota, great for dev)
 *   gemini-2.0-flash  → 1,500 RPD  ← good alternative
 *   gemini-2.5-flash  →    20 RPD  ← very restrictive, avoid on free tier
 *
 * Set GEMINI_MODEL=gemini-2.0-flash in backend/.env to override.
 */
const fallback = "gemini-1.5-flash";
export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_MODEL?.trim() ||
  process.env.GEMINI_TEXT_MODEL?.trim() ||
  fallback;
