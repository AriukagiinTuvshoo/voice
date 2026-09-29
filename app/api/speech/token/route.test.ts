import {describe,expect,it,vi,afterEach} from "vitest";
import {POST} from "./route";

describe("speech token boundary",()=>{
 afterEach(()=>{vi.restoreAllMocks();delete process.env.AZURE_SPEECH_KEY;delete process.env.AZURE_SPEECH_REGION});
 it("does not require Azure credentials during import or build",async()=>{
  const request=new Request("https://voice.example/api/speech/token",{method:"POST",headers:{origin:"https://voice.example"}});
  const response=await POST(request);
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({error:"provider_unavailable"});
 });
 it("does not accept cross-origin token requests",async()=>{
  process.env.AZURE_SPEECH_KEY="test-secret";
  process.env.AZURE_SPEECH_REGION="eastus";
  const request=new Request("https://voice.example/api/speech/token",{method:"POST",headers:{origin:"https://evil.example"}});
  const response=await POST(request);
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({error:"provider_unavailable"});
 });
 it("keeps the Azure key server-side when requesting a short-lived token",async()=>{
  process.env.AZURE_SPEECH_KEY="test-secret";
  process.env.AZURE_SPEECH_REGION="eastus";
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("short-lived-token",{status:200}));
  const request=new Request("https://voice.example/api/speech/token",{method:"POST",headers:{origin:"https://voice.example"}});
  const response=await POST(request);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({token:"short-lived-token",region:"eastus"});
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).toContain("eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken");
  expect(new Headers(init?.headers).get("Ocp-Apim-Subscription-Key")).toBe("test-secret");
 });
});
