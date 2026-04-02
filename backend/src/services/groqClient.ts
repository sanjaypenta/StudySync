import Groq from "groq-sdk";

/**
 * Central Groq client + model config.
 *
 * Model options (all free-tier friendly):
 *   llama-3.3-70b-versatile   ← high quality, default
 *   llama3-8b-8192            ← faster / lighter
 *   mixtral-8x7b-32768        ← long-context alternative
 *
 * Override via env:  GROQ_MODEL=llama3-8b-8192
 */
export const GROQ_MODEL =
  process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

export function getGroqClient(): Groq {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("GROQ_API_KEY is not set in backend/.env");
  return new Groq({ apiKey: key });
}

/**
 * Returns true when Groq is ready to use (key present).
 */
export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

/**
 * Calls the Groq chat completion API and returns the text content.
 * Throws a clean error message on failure.
 */
export async function groqChat(
  prompt: string,
  systemPrompt = "You are a helpful AI assistant."
): Promise<string> {
  const groq = getGroqClient();
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return text;
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    // Rate limit
    if (raw.includes("429") || raw.toLowerCase().includes("rate limit")) {
      throw new Error(
        "Groq API rate limit reached. Wait a moment and try again."
      );
    }
    // Auth
    if (
      raw.includes("401") ||
      raw.toLowerCase().includes("invalid api key")
    ) {
      throw new Error(
        "Groq API key is invalid. Check GROQ_API_KEY in backend/.env."
      );
    }
    // Model not found
    if (raw.includes("404") || raw.toLowerCase().includes("model")) {
      throw new Error(
        `Groq model "${GROQ_MODEL}" not found. Set GROQ_MODEL in backend/.env.`
      );
    }
    throw new Error(raw.length > 250 ? raw.slice(0, 250) + "…" : raw);
  }
}
