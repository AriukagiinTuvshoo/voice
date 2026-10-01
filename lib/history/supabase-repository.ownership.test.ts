import {describe,expect,it,vi} from "vitest";
import {SupabaseTranscriptRepository} from "./supabase-repository";
import {PersistenceError} from "./persistence-error";
const base={id:"session-1",created_at:"2026-10-01T00:00:00.000Z",updated_at:"2026-10-01T00:00:00.000Z",language:"mn",processing_mode:"standard",raw_text:"hello",processed_text:"hello",duration:1000,source:"browser",title:"Hello",owner_id:"user-a"};
function clientFor(userId:string|null){
 let capturedUpdate:any=null;let capturedUpsert:any=null;
 const chain:any={select:vi.fn(()=>chain),eq:vi.fn(()=>chain),order:vi.fn(()=>chain),maybeSingle:vi.fn(async()=>({data:base,error:null})),single:vi.fn(async()=>({data:{...base,owner_id:capturedUpsert?.owner_id??"user-a"},error:null})),upsert:vi.fn((row:any)=>{capturedUpsert=row;return chain}),update:vi.fn((row:any)=>{capturedUpdate=row;return chain}),delete:vi.fn(()=>chain),neq:vi.fn(()=>chain)};
 const client:any={auth:{getUser:vi.fn(async()=>({data:{user:userId?{id:userId,email:userId+"@example.com"}:null},error:null}))},from:vi.fn(()=>chain)};
 return {client,get capturedUpsert(){return capturedUpsert},get capturedUpdate(){return capturedUpdate}};
}
describe("Supabase ownership boundary",()=>{
 it("rejects cloud save without an authenticated user",async()=>{const {client}=clientFor(null);const repo=new SupabaseTranscriptRepository(client);await expect(repo.save({...toSession(),ownerId:"fake"})).rejects.toMatchObject({code:"permission_error"})});
 it("derives save ownership from the authenticated user",async()=>{const fixture=clientFor("user-a");const repo=new SupabaseTranscriptRepository(fixture.client);const saved=await repo.save(toSession("attacker"));expect(fixture.capturedUpsert.owner_id).toBe("user-a");expect(saved.ownerId).toBe("user-a")});
 it("never includes owner_id in application update payload",async()=>{const fixture=clientFor("user-a");const repo=new SupabaseTranscriptRepository(fixture.client);await repo.update("session-1",{title:"Edited"});expect(fixture.capturedUpdate).not.toHaveProperty("owner_id")});
});
function toSession(ownerId?:string){return{id:"session-1",createdAt:"2026-10-01T00:00:00.000Z",updatedAt:"2026-10-01T00:00:00.000Z",language:"mn" as const,processingMode:"standard" as const,rawText:"hello",processedText:"hello",durationMs:1000,source:"browser" as const,title:"Hello",...(ownerId?{ownerId}:{})}};
