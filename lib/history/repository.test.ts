import {beforeEach,describe,expect,it} from "vitest";
import {HistoryLimitError,LocalTranscriptRepository,type StorageLike} from "./repository";
import type {TranscriptSession} from "./types";

class MemoryStorage implements StorageLike {
  private data=new Map<string,string>();
  getItem(key:string){return this.data.get(key)??null}
  setItem(key:string,value:string){this.data.set(key,value)}
  removeItem(key:string){this.data.delete(key)}
}

const session=(id:string):TranscriptSession=>({
  id,
  createdAt:"2026-09-30T00:00:00.000Z",
  updatedAt:"2026-09-30T00:00:00.000Z",
  language:"en",
  processingMode:"standard",
  rawText:"raw",
  processedText:"processed",
  source:"browser",
  title:"Test transcript",
});

describe("LocalTranscriptRepository",()=>{
  let storage:MemoryStorage;
  let repo:LocalTranscriptRepository;
  beforeEach(()=>{storage=new MemoryStorage();repo=new LocalTranscriptRepository(storage)});

  it("saves, lists and gets sessions deterministically",async()=>{
    await repo.save(session("a"));
    await repo.save({...session("b"),createdAt:"2026-09-30T01:00:00.000Z"});
    expect((await repo.list()).map(item=>item.id)).toEqual(["b","a"]);
    expect((await repo.getById("a"))?.processedText).toBe("processed");
  });

  it("updates without changing raw text",async()=>{
    await repo.save(session("a"));
    const updated=await repo.update("a",{processedText:"edited",title:"Edited"});
    expect(updated.rawText).toBe("raw");
    expect(updated.processedText).toBe("edited");
    expect(updated.title).toBe("Edited");
  });

  it("deletes and clears history",async()=>{
    await repo.save(session("a"));
    await repo.save(session("b"));
    await repo.delete("a");
    expect((await repo.list()).map(item=>item.id)).toEqual(["b"]);
    await repo.clearHistory();
    expect(await repo.list()).toEqual([]);
  });

  it("ignores malformed stored entries and unknown schema versions",async()=>{
    storage.setItem("voice-history",JSON.stringify({version:1,sessions:[session("ok"),{id:null},null]}));
    expect((await repo.list()).map(item=>item.id)).toEqual(["ok"]);
    storage.setItem("voice-history",JSON.stringify({version:99,sessions:[session("ignored")]}));
    expect(await repo.list()).toEqual([]);
    storage.setItem("voice-history","not json");
    expect(await repo.list()).toEqual([]);
  });

  it("surfaces storage failures instead of crashing the caller",async()=>{
    const failing:StorageLike={getItem(){throw new Error("blocked")},setItem(){throw new Error("blocked")},removeItem(){throw new Error("blocked")}};
    const failingRepo=new LocalTranscriptRepository(failing);
    await expect(failingRepo.list()).rejects.toThrow("Unable to read local history.");
  });

  it("rejects a new session at the retention limit",async()=>{
    for(let i=0;i<100;i++) await repo.save({...session(String(i)),createdAt:`2026-09-30T00:00:${String(i%60).padStart(2,"0")}.000Z`});
    await expect(repo.save(session("overflow"))).rejects.toBeInstanceOf(HistoryLimitError);
  });
});
