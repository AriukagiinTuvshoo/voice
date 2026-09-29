import {describe,expect,it,vi,afterEach} from "vitest";
import {GET,POST} from "./route";

describe("speech token boundary",()=>{
 afterEach(()=>{vi.restoreAllMocks();delete process.env.AZURE_SPEECH_KEY;delete process.env.AZURE_SPEECH_REGION});

 it("rejects unsupported methods",async()=>{
  const response=await GET();
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow")).toBe("POST");
  expect(await response.json()).toEqual({error:"method_not_allowed"});
 });

 it("does not require Azure credentials during import or build",async()=>{
  const request=new Request("https://voice.example/api/speech/token",{method:"POST",headers:{origin:"https://voice.example"}});
  const response=await POST(request);
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({error:"provider_unavailable"});
 });

 it("does not accept cross-origin token requests",async()=>{
  process.env.AZURE_SPEECH_KEY="test-secret";
  process.env.AZURE_SPEECH_REGION="eastus";
  const request=new Request("https://voice.example/api/speech/token",{method:"POST",headers:{origin:"https://evil.example"}});
  const response=await POST(request);
  expect(response.status).toBe(403);
  expect(await response.text()).not.toContain("test-secret");
 });

 it("keeps the Azure key server-side when requesting a short-lived token",async()=>{
  process.env.AZURE_SPEECH_KEY="test-secret";
  process.env.AZURE_SPEECH_REGION="eastus";
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("short-lived-token",{status:200}));
  const request=new Request("https://voice.example/api/speech/token",{method:"POST",headers:{origin:"https://voice.example"}});
  const response=await POST(request);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({token:"short-lived-token",region:"eastus"});
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).toContain("eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken");
  expect(new Headers(init?.headers).get("Ocp-Apim-Subscription-Key")).toBe("test-secret");
 });

 it("returns a safe error when Azure rejects the request",async()=>{
  process.env.AZURE_SPEECH_KEY="test-secret";
  process.env.AZURE_SPEECH_REGION="eastus";
  vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("upstream-secret test-secret stack trace",{status:401}));
  const request=new Request("https://voice.example/api/speech/token",{method:"POST",headers:{origin:"https://voice.example"}});
  const response=await POST(request);
  const body=await response.text();
  expect(response.status).toBe(502);
  expect(body).toBe(JSON.stringify({error:"provider_unavailable"}));
  expect(body).not.toContain("test-secret");
 });
});
