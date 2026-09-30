import type {TranscriptSession} from "@/lib/history/types";

export function getDashboardStats(sessions:TranscriptSession[],now=Date.now()){
  const weekStart=now-7*86400000;
  const totalDurationMs=sessions.reduce((sum,item)=>sum+(item.durationMs??0),0);
  return {
    totalRecordings:sessions.length,
    thisWeek:sessions.filter(item=>Date.parse(item.createdAt)>=weekStart).length,
    totalDurationMs,
  };
}
