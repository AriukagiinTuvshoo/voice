import type {Language} from "@/lib/types";
export type VoiceLanguage=Language;
export type SpeechSessionState="idle"|"requesting_permission"|"recording"|"stopping"|"processing"|"success"|"error";
export type SpeechProviderState="idle"|"starting"|"recording"|"stopping"|"ended"|"error";
export type SpeechErrorCode="permission_denied"|"microphone_unavailable"|"browser_unsupported"|"provider_unavailable"|"network_error"|"recognition_error"|"audio_capture_error"|"language_not_supported"|"unknown_error";
export interface SpeechError{code:SpeechErrorCode;message:string;cause?:unknown}
export interface SpeechTranscript{text:string;isFinal:boolean;timestamp:number}
export interface SpeechSession{id:string;language:VoiceLanguage;state:SpeechSessionState;startedAt?:number;endedAt?:number;interimText:string;finalText:string;error?:SpeechError}
export interface SpeechStartOptions{language:VoiceLanguage;continuous?:boolean;interimResults?:boolean}
export interface SpeechProviderCapabilities{streaming:boolean;interimResults:boolean;finalResults:boolean;supportedLanguages:VoiceLanguage[];requiresMicrophonePermission:boolean}
export interface SpeechProvider{readonly id:string;readonly capabilities:SpeechProviderCapabilities;isSupported():boolean;start(options:SpeechStartOptions):Promise<void>;stop():Promise<void>;abort():Promise<void>;onInterimTranscript(callback:(text:string)=>void):()=>void;onFinalTranscript(callback:(text:string)=>void):()=>void;onError(callback:(error:SpeechError)=>void):()=>void;onStateChange(callback:(state:SpeechProviderState)=>void):()=>void}