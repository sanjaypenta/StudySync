import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_TEXT_MODEL } from "./geminiModel.js";

export async function generateBurnoutSessionTip(input: {
  taskTitle: string;
  subject: string;
  minutes: number;
  burnoutLevel: string;
  burnoutScore?: number;
  apiKey: string | undefined;
}): Promise<string | null> {
  const key = input.apiKey?.trim();
  if (!key) return null;
  const gen = new GoogleGenerativeAI(key).getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
  });
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
  const r = await gen.generateContent(prompt);
  const t = r.response.text()?.trim();
  return t || null;
}
