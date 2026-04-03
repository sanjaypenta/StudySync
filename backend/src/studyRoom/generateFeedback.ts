import { groqChat, groqConfigured } from "../services/groqClient.js";
import type { FeedbackPayload, MCQ } from "./types.js";
import {
  answersEquivalent,
  normalizeForAnswerMatch,
  normalizeForQuestionMatch,
} from "./answerMatch.js";

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
  _apiKey: string | undefined  // kept for compatibility, Groq key comes from env
): Promise<FeedbackPayload> {
  const total = quiz.length;
  let correct = 0;
  const wrongIdxs: number[] = [];
  for (let i = 0; i < quiz.length; i++) {
    const yours = userAnswers[i]?.answer ?? "";
    if (answersEquivalent(yours, quiz[i]?.answer ?? "")) {
      correct++;
    } else {
      wrongIdxs.push(i);
    }
  }

  if (!groqConfigured()) {
    return {
      score: `${correct}/${total}`,
      strengths: "No AI key configured.",
      weakness: "—",
      tips: "Configure GROQ_API_KEY in backend/.env.",
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

Facts:
- Deterministic score is ${correct}/${total}.
- Wrong question indexes (0-based): ${JSON.stringify(wrongIdxs)}.

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

  try {
    const text = await groqChat(
      prompt,
      "You are a supportive study coach. Return only valid JSON with no markdown or code fences."
    );
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

    // Build a best-effort explanation map from the AI response, but do NOT trust it
    // for correctness. Mistakes are computed deterministically below.
    const explanationByKey = new Map<string, string>();
    for (const m of mistakesRaw) {
      if (!m || typeof m !== "object") continue;
      const o = m as Record<string, unknown>;
      const qText = String(o.question ?? "");
      const cText = String(o.correct_answer ?? "");
      const exp = String(o.explanation ?? "");
      const key = `${normalizeForQuestionMatch(qText)}|${normalizeForAnswerMatch(cText)}`;
      if (key && exp) explanationByKey.set(key, exp);
    }

    const mistakes = wrongIdxs.map((i) => {
      const q = quiz[i];
      const yours = userAnswers[i]?.answer ?? "(no answer)";
      const key = `${normalizeForQuestionMatch(q.question)}|${normalizeForAnswerMatch(q.answer)}`;
      const explanation =
        explanationByKey.get(key) ||
        "Review why the correct option fits best, then retry a similar question.";
      return {
        question: q.question,
        your_answer: yours,
        correct_answer: q.answer,
        explanation,
      };
    });

    return {
      score: `${correct}/${total}`,
      strengths: String(parsed.strengths ?? "") || "Nice effort — keep going.",
      weakness: String(parsed.weakness ?? "") || "—",
      tips: String(parsed.tips ?? "") || "—",
      mistakes,
    };
  } catch {
    return {
      score: `${correct}/${total}`,
      strengths: "AI feedback failed. Try again.",
      weakness: "—",
      tips: "—",
      mistakes: wrongIdxs.map((i) => ({
        question: quiz[i]?.question ?? "",
        your_answer: userAnswers[i]?.answer ?? "(no answer)",
        correct_answer: quiz[i]?.answer ?? "",
        explanation: "Review the correct option and try a similar question again.",
      })),
    };
  }
}
