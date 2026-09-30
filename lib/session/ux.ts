import type {SpeechSessionState} from "@/lib/speech/types";

export type SessionUxState="idle"|"recording"|"processing"|"ready"|"saving"|"saved"|"error";

export function getSessionUxState(input:{
  speechState:SpeechSessionState;
  hasFinalText:boolean;
  saving:boolean;
  saved:boolean;
  hasError:boolean;
}):SessionUxState{
  if(input.hasError)return "error";
  if(input.saving)return "saving";
  if(input.saved)return "saved";
  if(input.speechState==="recording"||input.speechState==="requesting_permission"||input.speechState==="stopping")return "recording";
  if(input.speechState==="processing")return input.hasFinalText?"processing":"processing";
  if(input.hasFinalText)return "ready";
  return "idle";
}
