"use client";

import {toProviderLanguage} from "./language";
import {normalizeSpeechError} from "./errors";
import type {SpeechError,SpeechProvider,SpeechProviderCapabilities,SpeechProviderState,SpeechStartOptions} from "./types";

interface SpeechTokenResponse{token:string;region:string}

const TOKEN_TTL_MS=9*60*1000;
const TOKEN_TIMEOUT_MS=6000;
const REFRESH_INTERVAL_MS=8*60*1000;

function safeProviderError(message:string):SpeechError{
  return normalizeSpeechError({error:message});
}

export function normalizeCloudSpeechError(message:string):SpeechError{
  const value=message.toLowerCase();
  if(value.includes("not allowed")||value.includes("permission")||value.includes("denied")){
    return normalizeSpeechError({error:"not-allowed"});
  }
  if(value.includes("network")||value.includes("websocket")||value.includes("timeout")||value.includes("timed out")||value.includes("1006")){
    return normalizeSpeechError({error:"network"});
  }
  if(value.includes("language")){
    return normalizeSpeechError({error:"language-not-supported"});
  }
  if(value.includes("401")||value.includes("403")||value.includes("unauthorized")||value.includes("forbidden")||value.includes("authentication")||value.includes("token")){
    return normalizeSpeechError({error:"provider-unavailable"});
  }
  return normalizeSpeechError({error:"recognition-error"});
}

async function fetchSpeechToken():Promise<SpeechTokenResponse>{
  const response=await fetch("/api/speech/token",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    cache:"no-store",
    signal:AbortSignal.timeout(TOKEN_TIMEOUT_MS)
  });

  let payload:unknown;
  try{payload=await response.json()}catch{payload=null}

  if(!response.ok){
    const code=typeof payload==="object"&&payload!==null&&"error" in payload?String(payload.error):"provider-unavailable";
    throw normalizeSpeechError({error:code});
  }

  if(typeof payload!=="object"||payload===null||typeof payload.token!=="string"||typeof payload.region!=="string"){
    throw safeProviderError("provider-unavailable");
  }

  return {token:payload.token,region:payload.region};
}

export class CloudSpeechProvider implements SpeechProvider{
  readonly id="azure-speech";
  readonly capabilities:SpeechProviderCapabilities={
    streaming:true,
    interimResults:true,
    finalResults:true,
    supportedLanguages:["mn","en","ja"],
    requiresMicrophonePermission:true,
    ownsMicrophone:true
  };

  private recognizer:import("microsoft-cognitiveservices-speech-sdk").SpeechRecognizer|null=null;
  private audioConfig:import("microsoft-cognitiveservices-speech-sdk").AudioConfig|null=null;
  private refreshTimer:ReturnType<typeof setTimeout>|null=null;
  private intentionalStop=false;
  private sessionActive=false;
  private seenFinalIds=new Set<string>();
  private interimListeners=new Set<(text:string)=>void>();
  private finalListeners=new Set<(text:string)=>void>();
  private errorListeners=new Set<(error:SpeechError)=>void>();
  private stateListeners=new Set<(state:SpeechProviderState)=>void>();

  isSupported():boolean{
    return typeof window!=="undefined"&&typeof navigator!=="undefined"&&Boolean(navigator.mediaDevices)&&typeof fetch==="function";
  }

  private emitState(state:SpeechProviderState){this.stateListeners.forEach(callback=>callback(state))}

  async start(options:SpeechStartOptions):Promise<void>{
    if(!this.isSupported())throw normalizeSpeechError({error:"unsupported"});
    if(options.language==="auto")throw normalizeSpeechError({error:"language-not-supported"});
    if(this.sessionActive)await this.abort();

    const language=toProviderLanguage(options.language);
    if(!language)throw normalizeSpeechError({error:"language-not-supported"});

    this.intentionalStop=false;
    this.seenFinalIds.clear();
    this.emitState("starting");

    try{
      const [{token,region},sdk]=await Promise.all([fetchSpeechToken(),import("microsoft-cognitiveservices-speech-sdk")]);
      sdk.Recognizer.enableTelemetry(false);

      const speechConfig=sdk.SpeechConfig.fromAuthorizationToken(token,region);
      speechConfig.speechRecognitionLanguage=language;
      speechConfig.outputFormat=sdk.OutputFormat.Simple;
      const audioConfig=sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer=new sdk.SpeechRecognizer(speechConfig,audioConfig);

      this.audioConfig=audioConfig;
      this.recognizer=recognizer;
      this.sessionActive=true;

      recognizer.sessionStarted=()=>this.emitState("recording");
      recognizer.recognizing=(_sender,event)=>{
        const text=event.result.text?.trim()??"";
        if(text)this.interimListeners.forEach(callback=>callback(text));
      };
      recognizer.recognized=(_sender,event)=>{
        if(event.result.reason!==sdk.ResultReason.RecognizedSpeech)return;
        const text=event.result.text?.trim()??"";
        const resultId=event.result.resultId;
        if(!text||(resultId&&this.seenFinalIds.has(resultId)))return;
        if(resultId)this.seenFinalIds.add(resultId);
        this.finalListeners.forEach(callback=>callback(text));
      };
      recognizer.canceled=(_sender,event)=>{
        if(this.intentionalStop)return;
        const message=event.errorDetails||String(event.reason);
        this.errorListeners.forEach(callback=>callback(normalizeCloudSpeechError(message)));
        this.emitState("error");
        void this.cleanup();
      };
      recognizer.sessionStopped=()=>{
        this.emitState("ended");
        void this.cleanup();
      };

      await new Promise<void>((resolve,reject)=>{
        recognizer.startContinuousRecognitionAsync(resolve,error=>reject(normalizeCloudSpeechError(String(error))));
      });

      this.scheduleTokenRefresh();
    }catch(error){
      await this.cleanup();
      const speechError=error&&typeof error==="object"&&"code" in error?error as SpeechError:normalizeCloudSpeechError(error instanceof Error?error.message:String(error));
      this.errorListeners.forEach(callback=>callback(speechError));
      this.emitState("error");
      throw speechError;
    }
  }

  async stop():Promise<void>{
    if(!this.recognizer){this.emitState("ended");return}
    this.intentionalStop=true;
    this.emitState("stopping");
    const recognizer=this.recognizer;
    try{
      await new Promise<void>((resolve,reject)=>{
        recognizer.stopContinuousRecognitionAsync(resolve,error=>reject(normalizeCloudSpeechError(String(error))));
      });
    }finally{
      await this.cleanup();
    }
  }

  async abort():Promise<void>{
    this.intentionalStop=true;
    const recognizer=this.recognizer;
    if(!recognizer){await this.cleanup();this.emitState("ended");return}
    try{
      await new Promise<void>(resolve=>{
        recognizer.stopContinuousRecognitionAsync(()=>resolve(),()=>resolve());
      });
    }finally{
      await this.cleanup();
      this.emitState("ended");
    }
  }

  private scheduleTokenRefresh(){
    if(this.refreshTimer)clearTimeout(this.refreshTimer);
    this.refreshTimer=setTimeout(()=>{void this.refreshAuthorizationToken()},Math.min(REFRESH_INTERVAL_MS,TOKEN_TTL_MS));
  }

  private async refreshAuthorizationToken(){
    if(!this.sessionActive||!this.recognizer)return;
    try{
      const {token}=await fetchSpeechToken();
      if(this.recognizer)this.recognizer.authorizationToken=token;
      this.scheduleTokenRefresh();
    }catch(error){
      const speechError=error&&typeof error==="object"&&"code" in error?error as SpeechError:normalizeCloudSpeechError(error instanceof Error?error.message:String(error));
      this.errorListeners.forEach(callback=>callback(speechError));
      this.emitState("error");
      await this.cleanup();
    }
  }

  private async cleanup(){
    if(this.refreshTimer){clearTimeout(this.refreshTimer);this.refreshTimer=null}
    const recognizer=this.recognizer;
    const audioConfig=this.audioConfig;
    this.recognizer=null;
    this.audioConfig=null;
    this.sessionActive=false;
    this.seenFinalIds.clear();

    try{await recognizer?.close(()=>{},()=>{})}catch{}
    try{audioConfig?.close()}catch{}
  }

  onInterimTranscript(callback:(text:string)=>void){this.interimListeners.add(callback);return()=>this.interimListeners.delete(callback)}
  onFinalTranscript(callback:(text:string)=>void){this.finalListeners.add(callback);return()=>this.finalListeners.delete(callback)}
  onError(callback:(error:SpeechError)=>void){this.errorListeners.add(callback);return()=>this.errorListeners.delete(callback)}
  onStateChange(callback:(state:SpeechProviderState)=>void){this.stateListeners.add(callback);return()=>this.stateListeners.delete(callback)}

  destroy(){void this.abort();this.interimListeners.clear();this.finalListeners.clear();this.errorListeners.clear();this.stateListeners.clear()}
}
