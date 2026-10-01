import {
  HISTORY_LIMIT,
  HISTORY_SCHEMA_VERSION,
  HISTORY_STORAGE_KEY,
  type CreateTranscriptSessionInput,
  type TranscriptSession,
  type UpdateTranscriptSessionInput,
} from "./types";
import {parseHistoryEnvelope, isTranscriptSession} from "./validation";
import {generateTranscriptTitle} from "./title";

export interface TranscriptRepository {
  save(session: TranscriptSession): Promise<TranscriptSession>;
  list(): Promise<TranscriptSession[]>;
  getById(id: string): Promise<TranscriptSession | null>;
  update(id: string, input: UpdateTranscriptSessionInput): Promise<TranscriptSession>;
  delete(id: string): Promise<void>;
  clearHistory(): Promise<void>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class HistoryRepositoryError extends Error {
  constructor(message: string, options?: {cause?: unknown}) {
    super(message);
    this.name = "HistoryRepositoryError";
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export class HistoryLimitError extends HistoryRepositoryError {
  constructor() {
    super("History limit reached. Delete an existing transcript before saving another.");
    this.name = "HistoryLimitError";
  }
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

function sortSessions(sessions: TranscriptSession[]): TranscriptSession[] {
  return [...sessions].sort((a, b) => {
    const time = b.updatedAt.localeCompare(a.updatedAt);
    return time !== 0 ? time : b.id.localeCompare(a.id);
  });
}

function normalizeSession(session: TranscriptSession): TranscriptSession {
  return {
    ...session,
    rawText: session.rawText,
    processedText: session.processedText,
    title: generateTranscriptTitle(session.title) === "Untitled transcript"
      ? session.title.trim() || "Untitled transcript"
      : session.title.trim(),
  };
}

export class LocalTranscriptRepository implements TranscriptRepository {
  private readonly storage?: StorageLike | null;

  constructor(storage?: StorageLike | null) {
    this.storage = storage;
  }

  private getStorage(): StorageLike {
    const storage = this.storage === undefined ? browserStorage() : this.storage;
    if (!storage) throw new HistoryRepositoryError("Local history storage is unavailable.");
    return storage;
  }

  private read(): TranscriptSession[] {
    const storage = this.getStorage();
    try {
      return sortSessions(parseHistoryEnvelope(storage.getItem(HISTORY_STORAGE_KEY)).sessions);
    } catch (cause) {
      throw new HistoryRepositoryError("Unable to read local history.", {cause});
    }
  }

  private write(sessions: TranscriptSession[]): void {
    const storage = this.getStorage();
    try {
      storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({
        version: HISTORY_SCHEMA_VERSION,
        sessions: sortSessions(sessions),
      }));
    } catch (cause) {
      throw new HistoryRepositoryError("Unable to save local history.", {cause});
    }
  }

  async save(session: TranscriptSession): Promise<TranscriptSession> {
    if (!isTranscriptSession(session)) {
      throw new HistoryRepositoryError("Invalid transcript session.");
    }

    const sessions = this.read();
    const existingIndex = sessions.findIndex(item => item.id === session.id);
    if (existingIndex < 0 && sessions.length >= HISTORY_LIMIT) throw new HistoryLimitError();

    const next = existingIndex >= 0
      ? sessions.map(item => item.id === session.id ? normalizeSession(session) : item)
      : [...sessions, normalizeSession(session)];

    this.write(next);
    return session;
  }

  async list(): Promise<TranscriptSession[]> {
    return this.read();
  }

  async getById(id: string): Promise<TranscriptSession | null> {
    if (!id.trim()) return null;
    return this.read().find(session => session.id === id) ?? null;
  }

  async update(id: string, input: UpdateTranscriptSessionInput): Promise<TranscriptSession> {
    const sessions = this.read();
    const current = sessions.find(session => session.id === id);
    if (!current) throw new HistoryRepositoryError("Transcript session not found.");

    const updated: TranscriptSession = {
      ...current,
      ...(input.title !== undefined ? {title: input.title.trim() || "Untitled transcript"} : {}),
      ...(input.processedText !== undefined ? {processedText: input.processedText} : {}),
      ...(input.updatedAt !== undefined ? {updatedAt: input.updatedAt} : {}),
    };

    if (!isTranscriptSession(updated)) throw new HistoryRepositoryError("Invalid transcript update.");
    this.write(sessions.map(session => session.id === id ? updated : session));
    return updated;
  }

  async delete(id: string): Promise<void> {
    const sessions = this.read();
    this.write(sessions.filter(session => session.id !== id));
  }

  async clearHistory(): Promise<void> {
    const storage = this.getStorage();
    try {
      storage.removeItem(HISTORY_STORAGE_KEY);
    } catch (cause) {
      throw new HistoryRepositoryError("Unable to clear local history.", {cause});
    }
  }
}
