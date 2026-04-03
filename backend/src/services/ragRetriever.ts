/**
 * RAG Stage 2 — Retriever
 *
 * WHY RETRIEVAL?
 *   Not every chunk is relevant to the user's current goal.
 *   The Retriever evaluates all chunks and returns only the top most relevant ones,
 *   reducing noise and keeping the LLM focused on useful context.
 */

import type { TextChunk } from "./ragChunker.js";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "having", "have", "has", "had", "do", "does", "did", "this", "that",
  "these", "those", "if", "then", "than", "so", "as", "about", "which",
  "who", "what", "where", "when", "how", "I", "me", "my", "we", "us",
  "our", "you", "your", "they", "them", "their", "it", "its"
]);

export interface ScoredChunk extends TextChunk {
  score: number;
}

export const DEFAULT_TOP_K = 5;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function scoreChunk(chunkTokens: string[], goalKeywords: Set<string>): number {
  if (goalKeywords.size === 0 || chunkTokens.length === 0) return 0;

  const frequencyMap = new Map<string, number>();
  for (const token of chunkTokens) {
    if (goalKeywords.has(token)) {
      frequencyMap.set(token, (frequencyMap.get(token) ?? 0) + 1);
    }
  }

  if (frequencyMap.size === 0) return 0;

  // Use log(1+count) to reduce the effect of single words repeating excessively
  let rawScore = 0;
  for (const count of frequencyMap.values()) {
    rawScore += Math.log1p(count);
  }

  const recall = frequencyMap.size / goalKeywords.size;
  const lengthNorm = Math.log1p(chunkTokens.length);

  return (rawScore * recall) / lengthNorm;
}

export function retrieveTopChunks(
  chunks: TextChunk[],
  goal: string,
  topK: number = DEFAULT_TOP_K
): ScoredChunk[] {
  if (!chunks.length || !goal.trim()) return [];

  const goalKeywords = new Set(tokenize(goal));

  const scored: ScoredChunk[] = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.text);
    return { ...chunk, score: scoreChunk(chunkTokens, goalKeywords) };
  });

  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, topK);

  // Re-sort selected chunks by index to preserve chronological context
  topChunks.sort((a, b) => a.index - b.index);

  return topChunks;
}

export function buildContextFromChunks(chunks: ScoredChunk[]): string {
  if (!chunks.length) return "";
  return chunks
    .map((c) => `--- Excerpt ${c.index + 1} ---\n${c.text}`)
    .join("\n\n");
}
