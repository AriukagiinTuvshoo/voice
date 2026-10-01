export type PersistenceMode = "local" | "cloud";

export function getPersistenceMode(): PersistenceMode {
  return process.env.NEXT_PUBLIC_HISTORY_PERSISTENCE_MODE === "cloud" ? "cloud" : "local";
}
