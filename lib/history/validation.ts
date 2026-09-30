import type {Language, ProcessingMode} from "@/lib/types";
import {HISTORY_SCHEMA_VERSION, type TranscriptSession} from "./types";

const LANGUAGES: Language[] = ["mn", "en", "ja", "auto"];
const MODES: ProcessingMode[] = ["raw", "standard", "clean", "polished"];
const SOURCES = ["browser", "cloud", "unknown"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export function isTranscriptSession(value: unknown): value is TranscriptSession {
  if (!isRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isIsoTimestamp(value.createdAt) || !isIsoTimestamp(value.updatedAt)) return false;
  if (!LANGUAGES.includes(value.language as Language)) return false;
  if (!MODES.includes(value.processingMode as ProcessingMode)) return false;
  if (typeof value.rawText !== "string" || typeof value.processedText !== "string") return false;
  if (!SOURCES.includes(value.source as (typeof SOURCES)[number])) return false;
  if (!isNonEmptyString(value.title)) return false;
  if (value.durationMs !== undefined && (!Number.isFinite(value.durationMs) || value.durationMs < 0)) return false;
  if (value.ownerId !== undefined && typeof value.ownerId !== "string") return false;
  return true;
}

export interface HistoryEnvelope {
  version: typeof HISTORY_SCHEMA_VERSION;
  sessions: TranscriptSession[];
}

export function parseHistoryEnvelope(raw: string | null): HistoryEnvelope {
  if (!raw) return {version: HISTORY_SCHEMA_VERSION, sessions: []};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== HISTORY_SCHEMA_VERSION || !Array.isArray(parsed.sessions)) {
      return {version: HISTORY_SCHEMA_VERSION, sessions: []};
    }

    return {
      version: HISTORY_SCHEMA_VERSION,
      sessions: parsed.sessions.filter(isTranscriptSession),
    };
  } catch {
    return {version: HISTORY_SCHEMA_VERSION, sessions: []};
  }
}
