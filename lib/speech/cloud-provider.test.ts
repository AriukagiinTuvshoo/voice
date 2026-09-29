import {describe,expect,it} from "vitest";
import {CloudSpeechProvider,normalizeCloudSpeechError} from "./cloud-provider";

describe("cloud speech provider",()=>{
 it("maps Azure language errors and network failures into domain errors",()=>{
  expect(normalizeCloudSpeechError("language is not supported").code).toBe("language_not_supported");
  expect(normalizeCloudSpeechError("WebSocket connection failed").code).toBe("network_error");
  expect(normalizeCloudSpeechError("401 Unauthorized").code).toBe("provider_unavailable");
  expect(normalizeCloudSpeechError("microphone permission denied").code).toBe("permission_denied");
 });
 it("rejects auto detect explicitly",async()=>{
  const provider=new CloudSpeechProvider();
  (globalThis as {window?:unknown}).window={};
  await expect(provider.start({language:"auto",continuous:true,interimResults:true})).rejects.toMatchObject({code:"language_not_supported"});
  provider.destroy();
 });
 it("reports unsupported browser environments honestly",()=>{
  const provider=new CloudSpeechProvider();
  expect(provider.isSupported()).toBe(false);
  provider.destroy();
 });
});
