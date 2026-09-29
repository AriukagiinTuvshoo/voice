"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import {VoiceSpeechService} from "@/lib/speech/service";
import type {SpeechError,SpeechSessionState} from "@/lib/speech/types";
import type {Language} from "@/lib/types";

function id():string{
  return typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():String(Date.now());
}

function toSpeechError(error:unknown):SpeechError{
  if(typeof error==="object"&&error!==null&&"code" in error){
    return error as SpeechError;
  }
  return {code:"unknown_error",message:"Speech recognition эхлүүлж чадсангүй.",cause:error};
}

export function useSpeech(){
  const service=useRef<VoiceSpeechService|null>(null);
  const [state,setState]=useState<SpeechSessionState>("idle");
  const [interimText,setInterimText]=useState("");
  const [finalText,setFinalText]=useState("");
  const [error,setError]=useState<SpeechError|undefined>(undefined);
  const [supported,setSupported]=useState(false);
  const [capabilities,setCapabilities]=useState<ReturnType<VoiceSpeechService["getCapabilities"]>|undefined>(undefined);
  const sessionId=useRef(id());
  const startedAt=useRef<number|undefined>(undefined);

  useEffect(()=>{
    const s=new VoiceSpeechService();
    service.current=s;
    setSupported(s.isSupported());
    setCapabilities(s.getCapabilities());

    const clean=[
      s.onInterimTranscript(setInterimText),
      s.onFinalTranscript((text:string)=>setFinalText(value=>(value+" "+text).replace(/\s+/g," ").trim())),
      s.onError((speechError:SpeechError)=>{setError(speechError);setState("error");}),
      s.onStateChange((next)=>{if(next==="recording")setState("recording");if(next==="stopping")setState("stopping");if(next==="ended")setState("processing");})
    ];

    return ()=>{
      clean.forEach(fn=>fn());
      s.destroy();
      service.current=null;
    };
  },[]);

  const start=useCallback(async(language:Language)=>{
    setError(undefined);
    setInterimText("");
    setFinalText("");
    sessionId.current=id();
    startedAt.current=Date.now();
    setState("requesting_permission");
    try{
      await service.current?.start(language);
    }catch(cause){
      const speechError=toSpeechError(cause);
      setError(speechError);
      setState("error");
    }
  },[]);

  const stop=useCallback(async()=>{
    if(!service.current)return;
    setState("stopping");
    try{
      await service.current.stop();
      setState("processing");
    }catch(cause){
      const speechError=toSpeechError(cause);
      setError(speechError);
      setState("error");
    }
  },[]);

  const abort=useCallback(async()=>{
    await service.current?.abort();
    setInterimText("");
    setState("idle");
  },[]);

  return {session:{id:sessionId.current,language:"mn" as Language,state,startedAt:startedAt.current,endedAt:state==="success"||state==="error"?Date.now():undefined,interimText,finalText,error},start,stop,abort,supported,capabilities};
}