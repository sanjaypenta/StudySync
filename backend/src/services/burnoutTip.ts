import { groqChat, groqConfigured } from "./groqClient.js";

export async function generateBurnoutSessionTip(input: {
  taskTitle: string;
  subject: string;
  minutes: number;
  burnoutLevel: string;
  burnoutScore?: number;
  apiKey: string | undefined;
}): Promise<string | null> {
  if (!groqConfigured()) return null;
  const scoreLine =
    input.burnoutScore != null
      ? `Today's burnout score: ${input.burnoutScore}.`
      : "";
  const prompt = `You are a supportive study coach. The student just finished a focus session.
Task: ${input.taskTitle} (${input.subject})
Duration: about ${input.minutes} minutes.
Their self-reported burnout tendency: ${input.burnoutLevel}.
${scoreLine}
Reply with exactly 1-2 short sentences: one personalized tip to avoid burnout and stay consistent. No markdown, no greeting.`;
  try {
    const text = await groqChat(prompt, "You are a supportive study coach. Reply concisely with no markdown.");
    return text.trim() || null;
  } catch {
    return null;
  }
}
