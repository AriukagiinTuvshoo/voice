import type {Language, ProcessingMode} from "@/lib/types";
import {LocalTranscriptRepository, type TranscriptRepository} from "./repository";
import {generateTranscriptTitle} from "./title";
import type {CreateTranscriptSessionInput, TranscriptSession, UpdateTranscriptSessionInput} from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class HistoryService {
  constructor(private readonly repository: TranscriptRepository) {}

  async createSession(input: CreateTranscriptSessionInput, now = new Date()): Promise<TranscriptSession> {
    const timestamp = now.toISOString();
    const session: TranscriptSession = {
      id: createId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      language: input.language,
      processingMode: input.processingMode,
      rawText: input.rawText,
      processedText: input.processedText,
      ...(input.durationMs === undefined ? {} : {durationMs: Math.max(0, Math.round(input.durationMs))}),
      source: input.source ?? "unknown",
      title: input.title?.trim() || generateTranscriptTitle(input.processedText),
      ...(input.ownerId ? {ownerId: input.ownerId} : {}),
    };
    return this.repository.save(session);
  }

  listSessions(): Promise<TranscriptSession[]> {
    return this.repository.list();
  }

  getSession(id: string): Promise<TranscriptSession | null> {
    return this.repository.getById(id);
  }

  async updateSession(id: string, input: UpdateTranscriptSessionInput, now = new Date()): Promise<TranscriptSession> {
    const current = await this.repository.getById(id);
    if (!current) throw new Error("Transcript session not found.");
    return this.repository.update(id, {...input, ...(input.title === undefined && input.processedText === undefined ? {} : {})}).then(session => ({
      ...session,
      updatedAt: now.toISOString(),
    })).then(session => this.repository.save(session));
  }

  deleteSession(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  clearHistory(): Promise<void> {
    return this.repository.clearHistory();
  }
}

let defaultService: HistoryService | undefined;

export function getHistoryService(): HistoryService {
  defaultService ??= new HistoryService(new LocalTranscriptRepository());
  return defaultService;
}

export type {Language, ProcessingMode};
