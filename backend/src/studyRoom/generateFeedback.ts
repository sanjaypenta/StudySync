import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_TEXT_MODEL } from "../services/geminiModel.js";
import type { FeedbackPayload, MCQ } from "./types.js";

function extractJsonObject(text: string): string | null {
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}

export async function generateUserFeedback(
  topic: string,
  quiz: MCQ[],
  userAnswers: Record<number, { answer: string }>,
  displayName: string,
  apiKey: string | undefined
): Promise<FeedbackPayload> {
  if (!apiKey?.trim()) {
    return {
      score: "0/0",
      strengths: "No AI key configured.",
      weakness: "—",
      tips: "Configure GEMINI_API_KEY.",
      mistakes: [],
    };
  }

  const qa = quiz.map((q, i) => ({
    index: i,
    question: q.question,
    options: q.options,
    correct: q.answer,
    yours: userAnswers[i]?.answer ?? "(no answer)",
  }));

  const prompt = `You are a supportive study coach. Give personalized feedback for "${displayName}".

Topic: ${topic.slice(0, 500)}

Quiz Q&A:
${JSON.stringify(qa, null, 0)}

Return ONLY valid JSON (no markdown). Shape:
{
  "score": "X/Y" (correct/total),
  "strengths": "short paragraph",
  "weakness": "short paragraph",
  "tips": "short paragraph",
  "mistakes": [
    {
      "question": "question text",
      "your_answer": "what they picked",
      "correct_answer": "correct option text",
      "explanation": "1-2 simple sentences"
    }
  ]
}

Include mistakes ONLY for questions they got wrong. If none wrong, use "mistakes": [].`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = extractJsonObject(text);
  if (!jsonStr) {
    return {
      score: "?",
      strengths: "Could not parse AI feedback.",
      weakness: "—",
      tips: "—",
      mistakes: [],
    };
  }

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  const mistakesRaw = Array.isArray(parsed.mistakes) ? parsed.mistakes : [];

  const mistakes = mistakesRaw
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const o = m as Record<string, unknown>;
      return {
        question: String(o.question ?? ""),
        your_answer: String(o.your_answer ?? ""),
        correct_answer: String(o.correct_answer ?? ""),
        explanation: String(o.explanation ?? ""),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.question.length > 0);

  return {
    score: String(parsed.score ?? ""),
    strengths: String(parsed.strengths ?? ""),
    weakness: String(parsed.weakness ?? ""),
    tips: String(parsed.tips ?? ""),
    mistakes,
  };
}
