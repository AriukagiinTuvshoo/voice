import {toProviderLanguage} from "./language";
import {normalizeSpeechError} from "./errors";
import type {SpeechProvider,SpeechProviderCapabilities,SpeechProviderState,SpeechStartOptions,SpeechError} from "./types";

type RecognitionResult={isFinal:boolean;length:number;[index:number]:{[index:number]:{transcript:string}}};
interface RecognitionEvent{results:{length:number;[index:number]:RecognitionResult};resultIndex:number}
interface RecognitionLike{lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;start():void;stop():void;abort():void;onresult:((event:RecognitionEvent)=>void)|null;onerror:((event:unknown)=>void)|null;onstart:(()=>void)|null;onend:(()=>void)|null}
type RecognitionConstructor=new()=>RecognitionLike;
declare global{interface Window{SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor}}

export class BrowserSpeechProvider implements SpeechProvider{
 readonly id="browser-web-speech";
 readonly capabilities:SpeechProviderCapabilities={streaming:true,interimResults:true,finalResults:true,supportedLanguages:["mn","en","ja"],requiresMicrophonePermission:true};
 private recognition:RecognitionLike|null=null;
 private interimListeners=new Set<(text:string)=>void>();private finalListeners=new Set<(text:string)=>void>();private errorListeners=new Set<(error:SpeechError)=>void>();private stateListeners=new Set<(state:SpeechProviderState)=>void>();
 private intentionalStop=false;
 isSupported(){return typeof window!=="undefined"&&!!(window.SpeechRecognition||window.webkitSpeechRecognition)}
 private emitState(state:SpeechProviderState){this.stateListeners.forEach(fn=>fn(state))}
 async start(options:SpeechStartOptions){
  if(!this.isSupported())throw normalizeSpeechError({error:"unsupported"});
  if(options.language==="auto")throw normalizeSpeechError({error:"language-not-supported"});
  const C=window.SpeechRecognition||window.webkitSpeechRecognition;if(!C)throw normalizeSpeechError({error:"unsupported"});
  this.intentionalStop=false;this.recognition=new C();const r=this.recognition;
  r.lang=toProviderLanguage(options.language)||"en-US";r.continuous=options.continuous??true;r.interimResults=options.interimResults??true;r.maxAlternatives=1;
  r.onstart=()=>this.emitState("recording");
  r.onresult=(event)=>{let interim="";let finalText="";for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i];const t=result[0]?.transcript?.trim()||"";if(!t)continue;if(result.isFinal)finalText+=t+" ";else interim+=t+" "}if(interim.trim())this.interimListeners.forEach(fn=>fn(interim.trim()));if(finalText.trim())this.finalListeners.forEach(fn=>fn(finalText.trim()))};
  r.onerror=(event)=>{const e=normalizeSpeechError(event);if(e.code!=="provider_unavailable")this.errorListeners.forEach(fn=>fn(e));};
  r.onend=()=>{this.emitState(this.intentionalStop?"ended":"idle");this.recognition=null};
  this.emitState("starting");try{r.start()}catch(error){this.recognition=null;this.emitState("error");throw normalizeSpeechError(error)}
 }
 async stop(){this.intentionalStop=true;this.emitState("stopping");this.recognition?.stop()}
 async abort(){this.intentionalStop=true;this.recognition?.abort();this.recognition=null;this.emitState("ended")}
 onInterimTranscript(cb){this.interimListeners.add(cb);return()=>this.interimListeners.delete(cb)}
 onFinalTranscript(cb){this.finalListeners.add(cb);return()=>this.finalListeners.delete(cb)}
 onError(cb){this.errorListeners.add(cb);return()=>this.errorListeners.delete(cb)}
 onStateChange(cb){this.stateListeners.add(cb);return()=>this.stateListeners.delete(cb)}
}