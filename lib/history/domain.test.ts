import {describe,expect,it} from "vitest";
import {HistoryService} from "./service";
import {generateTranscriptTitle} from "./title";
import type {TranscriptRepository} from "./repository";
import type {TranscriptSession} from "./types";

class FakeRepository implements TranscriptRepository {
  sessions:TranscriptSession[]=[];
  async save(session:TranscriptSession){const index=this.sessions.findIndex(item=>item.id===session.id);if(index>=0)this.sessions[index]=session;else this.sessions.push(session);return session}
  async list(){return this.sessions}
  async getById(id:string){return this.sessions.find(item=>item.id===id)??null}
  async update(id:string,input:{title?:string;processedText?:string}){const current=await this.getById(id);if(!current)throw new Error("missing");const updated={...current,...input};this.sessions=this.sessions.map(item=>item.id===id?updated:item);return updated}
  async delete(id:string){this.sessions=this.sessions.filter(item=>item.id!==id)}
  async clearHistory(){this.sessions=[]}
}

describe("history domain",()=>{
  it("creates stable session data with generated title and canonical timestamps",async()=>{
    const repository=new FakeRepository();
    const service=new HistoryService(repository);
    const created=await service.createSession({language:"mn",processingMode:"clean",rawText:"raw",processedText:"hello world",durationMs:1234,source:"browser"},new Date("2026-09-30T01:02:03.000Z"));
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBe("2026-09-30T01:02:03.000Z");
    expect(created.updatedAt).toBe(created.createdAt);
    expect(created.title).toBe("hello world");
    expect(created.rawText).toBe("raw");
  });

  it("keeps an explicit title and has an empty fallback",async()=>{
    const repository=new FakeRepository();
    const service=new HistoryService(repository);
    expect(generateTranscriptTitle("   ")).toBe("Untitled transcript");
    const created=await service.createSession({language:"en",processingMode:"raw",rawText:"",processedText:"",title:" My note "},new Date("2026-09-30T01:00:00.000Z"));
    expect(created.title).toBe("My note");
  });

  it("keeps raw text when processed text is edited",async()=>{
    const repository=new FakeRepository();
    const service=new HistoryService(repository);
    const created=await service.createSession({language:"en",processingMode:"standard",rawText:"original",processedText:"processed"},new Date("2026-09-30T01:00:00.000Z"));
    const edited=await service.updateSession(created.id,{processedText:"manual edit",title:"New title"},new Date("2026-09-30T02:00:00.000Z"));
    expect(edited.rawText).toBe("original");
    expect(edited.processedText).toBe("manual edit");
    expect(edited.updatedAt).toBe("2026-09-30T02:00:00.000Z");
  });
});
