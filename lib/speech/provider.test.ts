import {describe,expect,it,afterEach} from "vitest";
import {BrowserSpeechProvider} from "./browser-provider";
import {CloudSpeechProvider} from "./cloud-provider";
import {createSpeechProvider} from "./provider";

afterEach(()=>{delete (globalThis as {window?:unknown}).window});

describe("speech providers",()=>{
 it("declares browser and cloud capabilities without Azure secrets",()=>{
  const browser=new BrowserSpeechProvider();
  const cloud=new CloudSpeechProvider();
  expect(browser.capabilities.supportedLanguages).toEqual(["mn","en","ja"]);
  expect(cloud.capabilities.supportedLanguages).toEqual(["mn","en","ja"]);
  expect(cloud.capabilities.streaming).toBe(true);
  expect(cloud.capabilities.ownsMicrophone).toBe(true);
  cloud.destroy();
  browser.destroy();
 });
 it("creates the requested provider behind the shared abstraction",()=>{
  expect(createSpeechProvider("browser").id).toBe("browser-web-speech");
  expect(createSpeechProvider("cloud").id).toBe("azure-speech");
 });
});
