import {BrowserSpeechProvider} from "./browser-provider";import type {SpeechProvider} from "./types";
let singleton:SpeechProvider|null=null;
export function getSpeechProvider():SpeechProvider{if(typeof window==="undefined")throw new Error("Speech provider is browser-only");return singleton??(singleton=new BrowserSpeechProvider())}