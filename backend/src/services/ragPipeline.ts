/**
 * RAG Pipeline Orchestrator
 *
 * It connects the extraction, chunking, retrieval, and context building stages.
 */

import { chunkText, type TextChunk } from "./ragChunker.js";
import {
  retrieveTopChunks,
  buildContextFromChunks,
  DEFAULT_TOP_K,
  type ScoredChunk,
} from "./ragRetriever.js";

export interface RAGMeta {
  totalChunks: number;
  selectedChunks: number;
  contextChars: number;
  hadRelevantContent: boolean;
  avgRelevanceScore: number;
}

export interface RAGResult {
  contextText: string;
  chunks: ScoredChunk[];
  meta: RAGMeta;
}

const MAX_CONTEXT_CHARS = 12_000;
const TOP_K = DEFAULT_TOP_K;

export function runRAGPipeline(
  rawText: string,
  goal: string,
  topK: number = TOP_K
): RAGResult {
  const allChunks = chunkText(rawText);

  if (allChunks.length === 0) {
    return emptyResult();
  }

  const topChunks = retrieveTopChunks(allChunks, goal, topK);

  if (topChunks.length === 0) {
    return emptyResult();
  }

  let contextText = buildContextFromChunks(topChunks);

  if (contextText.length > MAX_CONTEXT_CHARS) {
    contextText =
      contextText.slice(0, MAX_CONTEXT_CHARS) +
      "\n\n[… context trimmed for length …]";
  }

  const avgScore =
    topChunks.reduce((sum, c) => sum + c.score, 0) / topChunks.length;

  return {
    contextText,
    chunks: topChunks,
    meta: {
      totalChunks: allChunks.length,
      selectedChunks: topChunks.length,
      contextChars: contextText.length,
      hadRelevantContent: avgScore > 0,
      avgRelevanceScore: Math.round(avgScore * 1000) / 1000,
    },
  };
}

export function runRAGPipelineOnMerged(
  pdfText: string | undefined,
  pdfNotes: string | undefined,
  goal: string,
  topK: number = TOP_K
): RAGResult {
  const parts: string[] = [];
  if (pdfNotes?.trim()) parts.push(pdfNotes.trim());
  if (pdfText?.trim()) parts.push(pdfText.trim());
  const merged = parts.join("\n\n");

  return runRAGPipeline(merged, goal, topK);
}

function emptyResult(): RAGResult {
  return {
    contextText: "",
    chunks: [],
    meta: {
      totalChunks: 0,
      selectedChunks: 0,
      contextChars: 0,
      hadRelevantContent: false,
      avgRelevanceScore: 0,
    },
  };
}
