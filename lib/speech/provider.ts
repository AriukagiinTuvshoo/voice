import {BrowserSpeechProvider} from "./browser-provider";
import {CloudSpeechProvider} from "./cloud-provider";
import type {SpeechProvider,SpeechProviderKind} from "./types";

let singleton:SpeechProvider|null=null;

export function getPreferredSpeechProviderKind():SpeechProviderKind{
  return process.env.NEXT_PUBLIC_SPEECH_PROVIDER==="browser"?"browser":"cloud";
}

export function createSpeechProvider(kind:SpeechProviderKind):SpeechProvider{
  return kind==="cloud"?new CloudSpeechProvider():new BrowserSpeechProvider();
}

export function getSpeechProvider():SpeechProvider{
  if(typeof window==="undefined")throw new Error("Speech provider is browser-only");
  return singleton??(singleton=createSpeechProvider(getPreferredSpeechProviderKind()));
}

export function resetSpeechProviderForTests():void{
  singleton?.destroy();
  singleton=null;
}
