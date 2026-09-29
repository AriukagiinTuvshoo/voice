import {toProviderLanguage} from "./language";
import {normalizeSpeechError} from "./errors";
import type {SpeechProvider,SpeechProviderCapabilities,SpeechProviderState,SpeechStartOptions,SpeechError} from "./types";

interface RecognitionAlternative{transcript:string}
interface RecognitionResult{isFinal:boolean;length:number;[index:number]:RecognitionAlternative}
interface RecognitionResultList{length:number;[index:number]:RecognitionResult}
interface RecognitionEvent{results:RecognitionResultList;resultIndex:number}
interface RecognitionLike{lang:string;continuous:boolean;interimResults:boolean;maxAlternatives:number;start():void;stop():void;abort():void;onresult:((event:RecognitionEvent)=>void)|null;onerror:((event:unknown)=>void)|null;onstart:(()=>void)|null;onend:(()=>void)|null}
type RecognitionConstructor=new()=>RecognitionLike;
declare global{interface Window{SpeechRecognition?:RecognitionConstructor;webkitSpeechRecognition?:RecognitionConstructor}}

export class BrowserSpeechProvider implements SpeechProvider{
 readonly id="browser-web-speech";
 readonly capabilities:SpeechProviderCapabilities={streaming:true,interimResults:true,finalResults:true,supportedLanguages:["mn","en","ja"],requiresMicrophonePermission:true,ownsMicrophone:true};
 private recognition:RecognitionLike|null=null;
 private interimListeners=new Set<(text:string)=>void>();
 private finalListeners=new Set<(text:string)=>void>();
 private errorListeners=new Set<(error:SpeechError)=>void>();
 private stateListeners=new Set<(state:SpeechProviderState)=>void>();
 private intentionalStop=false;
 isSupported():boolean{return typeof window!=="undefined"&&Boolean(window.SpeechRecognition||window.webkitSpeechRecognition)}
 private emitState(state:SpeechProviderState):void{this.stateListeners.forEach(callback=>callback(state))}
 async start(options:SpeechStartOptions):Promise<void>{
  if(!this.isSupported())throw normalizeSpeechError({error:"unsupported"});
  if(options.language==="auto")throw normalizeSpeechError({error:"language-not-supported"});
  const Constructor=window.SpeechRecognition??window.webkitSpeechRecognition;
  if(!Constructor)throw normalizeSpeechError({error:"unsupported"});
  if(this.recognition)await this.abort();
  this.intentionalStop=false;
  const recognition=new Constructor();
  this.recognition=recognition;
  recognition.lang=toProviderLanguage(options.language)??"en-US";
  recognition.continuous=options.continuous??true;
  recognition.interimResults=options.interimResults??true;
  recognition.maxAlternatives=1;
  recognition.onstart=():void=>{if(this.recognition===recognition)this.emitState("recording")};
  recognition.onresult=(event:RecognitionEvent):void=>{
   if(this.recognition!==recognition)return;
   let interim="";let finalText="";
   for(let index=event.resultIndex;index<event.results.length;index+=1){
    const result=event.results[index];
    const transcript=result[0]?.transcript?.trim()??"";
    if(!transcript)continue;
    if(result.isFinal)finalText+=transcript+" ";else interim+=transcript+" ";
   }
   const normalizedInterim=interim.trim();const normalizedFinal=finalText.trim();
   if(normalizedInterim)this.interimListeners.forEach(callback=>callback(normalizedInterim));
   if(normalizedFinal)this.finalListeners.forEach(callback=>callback(normalizedFinal));
  };
  recognition.onerror=(event:unknown):void=>{
   if(this.recognition!==recognition)return;
   const error=normalizeSpeechError(event);
   if(error.code!=="provider_unavailable")this.errorListeners.forEach(callback=>callback(error));
  };
  recognition.onend=():void=>{
   if(this.recognition!==recognition)return;
   this.emitState(this.intentionalStop?"ended":"idle");
   this.recognition=null;
  };
  this.emitState("starting");
  try{recognition.start()}catch(error){if(this.recognition===recognition)this.recognition=null;this.emitState("error");throw normalizeSpeechError(error)}
 }
 async stop():Promise<void>{this.intentionalStop=true;this.emitState("stopping");this.recognition?.stop()}
 async abort():Promise<void>{this.intentionalStop=true;const recognition=this.recognition;this.recognition=null;recognition?.abort();this.emitState("ended")}
 onInterimTranscript(callback:(text:string)=>void):()=>void{this.interimListeners.add(callback);return()=>this.interimListeners.delete(callback)}
 onFinalTranscript(callback:(text:string)=>void):()=>void{this.finalListeners.add(callback);return()=>this.finalListeners.delete(callback)}
 onError(callback:(error:SpeechError)=>void):()=>void{this.errorListeners.add(callback);return()=>this.errorListeners.delete(callback)}
 onStateChange(callback:(state:SpeechProviderState)=>void):()=>void{this.stateListeners.add(callback);return()=>this.stateListeners.delete(callback)}
 destroy(){void this.abort();this.interimListeners.clear();this.finalListeners.clear();this.errorListeners.clear();this.stateListeners.clear()}
}
