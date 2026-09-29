import {BrowserAudioCapture} from "./audio-capture";import {getSpeechProvider} from "./provider";import {normalizeSpeechError} from "./errors";import type {SpeechError,SpeechProvider,SpeechProviderCapabilities,SpeechProviderState} from "./types";import type {Language} from "@/lib/types";
export class VoiceSpeechService{
 private provider:SpeechProvider;private audio=new BrowserAudioCapture();private cleanups:(()=>void)[]=[];private errors=new Set<(e:SpeechError)=>void>();private interim=new Set<(t:string)=>void>();private finals=new Set<(t:string)=>void>();private states=new Set<(s:SpeechProviderState)=>void>();
 constructor(provider=getSpeechProvider()){this.provider=provider;this.cleanups=[this.provider.onError(e=>{void this.audio.abort();this.errors.forEach(fn=>fn(e))}),this.provider.onInterimTranscript(t=>this.interim.forEach(fn=>fn(t))),this.provider.onFinalTranscript(t=>this.finals.forEach(fn=>fn(t))),this.provider.onStateChange(s=>{if(s==="error"||s==="ended")void this.audio.abort();this.states.forEach(fn=>fn(s))})]}
 async start(language:Language){if(!this.provider.isSupported())throw normalizeSpeechError({error:"unsupported"});if(language==="auto")throw normalizeSpeechError({error:"language-not-supported"});await this.audio.start();try{await this.provider.start({language,continuous:true,interimResults:true})}catch(error){await this.audio.abort();throw error}}
 async stop(){try{await this.provider.stop()}finally{await this.audio.stop()}}
 async abort(){try{await this.provider.abort()}finally{await this.audio.abort()}}
 getCapabilities():SpeechProviderCapabilities{return this.provider.capabilities}isSupported(){return this.provider.isSupported()}
 onInterimTranscript(cb:(t:string)=>void){this.interim.add(cb);return()=>this.interim.delete(cb)}
 onFinalTranscript(cb:(t:string)=>void){this.finals.add(cb);return()=>this.finals.delete(cb)}
 onError(cb:(e:SpeechError)=>void){this.errors.add(cb);return()=>this.errors.delete(cb)}
 onStateChange(cb:(s:SpeechProviderState)=>void){this.states.add(cb);return()=>this.states.delete(cb)}
 destroy(){this.cleanups.forEach(fn=>fn());this.cleanups=[];void this.abort();this.errors.clear();this.interim.clear();this.finals.clear();this.states.clear()}
}