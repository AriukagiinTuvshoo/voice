import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const migration=readFileSync(resolve(process.cwd(),"supabase/migrations/20261001000000_create_transcript_sessions.sql"),"utf8");
describe("transcript ownership RLS contract",()=>{
 it("protects every CRUD operation with auth.uid ownership",()=>{
  expect(migration).toMatch(/for select to authenticated using.*auth\.uid\(\).*owner_id/i);
  expect(migration).toMatch(/for insert to authenticated with check.*auth\.uid\(\).*owner_id/i);
  expect(migration).toMatch(/for update to authenticated using.*auth\.uid\(\).*owner_id.*with check.*auth\.uid\(\).*owner_id/i);
  expect(migration).toMatch(/for delete to authenticated using.*auth\.uid\(\).*owner_id/i);
 });
 it("does not grant transcript access to anon or use public policies",()=>{
  expect(migration).toContain("revoke all on table public.transcript_sessions from anon,authenticated;");
  expect(migration).not.toMatch(/using\s*\(\s*true\s*\)/i);
 });
});
