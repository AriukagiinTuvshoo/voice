import type {Language, ProcessingMode} from "@/lib/types";

export const HISTORY_SCHEMA_VERSION = 1;
export const HISTORY_STORAGE_KEY = "voice-history";
export const HISTORY_LIMIT = 100;

export type TranscriptSource = "browser" | "cloud" | "unknown";

export interface TranscriptSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  language: Language;
  processingMode: ProcessingMode;
  rawText: string;
  processedText: string;
  durationMs?: number;
  source: TranscriptSource;
  title: string;
  ownerId?: string;
}

export interface CreateTranscriptSessionInput {
  language: Language;
  processingMode: ProcessingMode;
  rawText: string;
  processedText: string;
  durationMs?: number;
  source?: TranscriptSource;
  title?: string;
  ownerId?: string;
}

export interface UpdateTranscriptSessionInput {
  title?: string;
  processedText?: string;
}
