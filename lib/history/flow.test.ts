import {describe,expect,it} from "vitest";
import {HistoryService} from "./service";
import {LocalTranscriptRepository,type StorageLike} from "./repository";

class MemoryStorage implements StorageLike {
  private data=new Map<string,string>();
  getItem(key:string){return this.data.get(key)??null}
  setItem(key:string,value:string){this.data.set(key,value)}
  removeItem(key:string){this.data.delete(key)}
}

describe("history persistence flow",()=>{
  it("creates, reloads, edits and deletes a finalized transcript",async()=>{
    const storage=new MemoryStorage();
    const service=new HistoryService(new LocalTranscriptRepository(storage));
    const created=await service.createSession({
      language:"en",
      processingMode:"standard",
      rawText:"  hello   world  ",
      processedText:"hello world.",
      source:"browser",
      durationMs:2100,
    },new Date("2026-09-30T03:00:00.000Z"));

    expect((await service.listSessions()).map(item=>item.id)).toEqual([created.id]);
    const opened=await service.getSession(created.id);
    expect(opened?.rawText).toBe("  hello   world  ");

    const edited=await service.updateSession(created.id,{processedText:"edited transcript",title:"Edited"},new Date("2026-09-30T03:01:00.000Z"));
    expect(edited.rawText).toBe("  hello   world  ");
    expect(edited.processedText).toBe("edited transcript");
    expect(edited.updatedAt).toBe("2026-09-30T03:01:00.000Z");

    const reloaded=await service.getSession(created.id);
    expect(reloaded?.processedText).toBe("edited transcript");

    await service.deleteSession(created.id);
    expect(await service.getSession(created.id)).toBeNull();
  });
});
