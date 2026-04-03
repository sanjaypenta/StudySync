/**
 * RAG Stage 1 — Text Chunker
 *
 * WHY CHUNKING?
 *   Language Models have a strictly limited context window. We cannot send an entire 100-page PDF
 *   directly to the model without exceeding token limits or losing focus ("lost in the middle").
 *   Chunking breaks the full text into smaller, self-contained segments (~300-500 words).
 *   This allows the Retrieval stage to find the precise passages that are relevant to the user's goal.
 */

export interface TextChunk {
  index: number;
  text: string;
  wordCount: number;
}

const CHUNK_WORD_MIN = 50;
const CHUNK_WORD_TARGET = 400;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function splitLargeParagraph(para: string): string[] {
  // Split on sentences
  const sentences = para.match(/[^.!?]+[.!?]+[\s]*/g) ?? [para];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current + sentence;
    if (wordCount(candidate) > CHUNK_WORD_TARGET && current.trim()) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [para.trim()];
}

export function chunkText(text: string): TextChunk[] {
  if (!text || !text.trim()) return [];

  // Split on double newlines to try and preserve paragraph boundaries
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => p.length > 0);

  const rawChunks: string[] = [];
  let accumulator = "";

  for (const para of paragraphs) {
    const pWordCount = wordCount(para);

    // If a paragraph is too long, fall back to sentence splitting
    if (pWordCount > CHUNK_WORD_TARGET * 1.5) {
      if (accumulator.trim()) {
        rawChunks.push(accumulator.trim());
        accumulator = "";
      }
      rawChunks.push(...splitLargeParagraph(para));
      continue;
    }

    const candidate = accumulator ? `${accumulator}\n\n${para}` : para;
    if (wordCount(candidate) > CHUNK_WORD_TARGET && accumulator.trim()) {
      rawChunks.push(accumulator.trim());
      accumulator = para;
    } else {
      accumulator = candidate;
    }
  }

  if (accumulator.trim()) rawChunks.push(accumulator.trim());

  return rawChunks
    .filter((c) => wordCount(c) >= CHUNK_WORD_MIN)
    .map((text, index) => ({
      index,
      text,
      wordCount: wordCount(text),
    }));
}
