import {describe,expect,it} from "vitest";
import {searchTranscriptSessions} from "./search";
import type {TranscriptSession} from "./types";

const make=(id:string,title:string,processedText:string,rawText=processedText):TranscriptSession=>({
  id,createdAt:"2026-09-30T00:00:00.000Z",updatedAt:"2026-09-30T00:00:00.000Z",language:"en",processingMode:"standard",rawText,processedText,source:"browser",title,
});

describe("history search",()=>{
  const sessions=[make("1","Morning meeting","Discuss the launch plan"),make("2","Shopping","Buy milk", "remember the MILK")];

  it("searches title, processed and raw text case-insensitively",()=>{
    expect(searchTranscriptSessions(sessions,"morning").map(item=>item.id)).toEqual(["1"]);
    expect(searchTranscriptSessions(sessions,"launch").map(item=>item.id)).toEqual(["1"]);
    expect(searchTranscriptSessions(sessions,"milk").map(item=>item.id)).toEqual(["2"]);
  });

  it("returns all sessions for an empty or whitespace query",()=>{
    expect(searchTranscriptSessions(sessions,"   ")).toEqual(sessions);
  });

  it("returns no results for a missing query",()=>{
    expect(searchTranscriptSessions(sessions,"not found")).toEqual([]);
  });
});
