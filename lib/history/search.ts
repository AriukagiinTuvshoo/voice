import type {TranscriptSession} from "./types";

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export function searchTranscriptSessions(sessions: TranscriptSession[], query: string): TranscriptSession[] {
  const needle = normalize(query);
  if (!needle) return [...sessions];

  return sessions.filter(session =>
    [session.title, session.processedText, session.rawText]
      .some(value => normalize(value).includes(needle)),
  );
}
