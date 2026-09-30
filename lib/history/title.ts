const FALLBACK_TITLE = "Untitled transcript";

export function generateTranscriptTitle(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return FALLBACK_TITLE;

  const words = normalized
    .split(" ")
    .map(word => word.replace(/^[.,!?;:]+|[.,!?;:]+$/g, ""))
    .filter(Boolean);

  if (!words.length) return FALLBACK_TITLE;

  const title = words.slice(0, 8).join(" ");
  return title.length > 64 ? title.slice(0, 61).trimEnd() + "..." : title;
}

export const DEFAULT_TRANSCRIPT_TITLE = FALLBACK_TITLE;
