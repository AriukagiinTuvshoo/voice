"use client";

import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {useSettings} from "@/lib/settings-context";
import {useSpeech} from "@/hooks/useSpeech";
import {getHistoryService} from "@/lib/history/service";
import {languages} from "@/lib/constants";
import type {Language} from "@/lib/types";
import {getSessionUxState} from "@/lib/session/ux";

function LanguageSelect({value,onChange}:{value:Language;onChange:(v:Language)=>void}){
  return <label className="language"><span className="sr">Language</span><select value={value} onChange={e=>onChange(e.target.value as Language)}>{languages.map(x=><option key={x.value} value={x.value}>{x.icon} {x.label}</option>)}</select></label>;
}
function mergeText(finalText:string,interim:string){return [finalText.trim(),interim.trim()].filter(Boolean).join(" ")}
export function VoiceWorkspace(){
  const {settings,update}=useSettings();
  const speech=useSpeech({mode:settings.processingMode,autoPunctuation:settings.autoPunctuation,autoCorrection:settings.autoCorrection,removeFillers:settings.removeFillers});
  const {start:startSpeech,stop:stopSpeech}=speech;
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState("");
  const [saveError,setSaveError]=useState("");
  const [saved,setSaved]=useState(false);
  const [saving,setSaving]=useState(false);
  const [copyState,setCopyState]=useState<"idle"|"copied"|"failed">("idle");
  const [dirty,setDirty]=useState(false);
  const [retrySave,setRetrySave]=useState(0);
  const savingRef=useRef(false);
  const push=useRef(false);
  const savedSessionId=useRef<string|null>(null);
  const sessionProcessingMode=useRef(settings.processingMode);
  const timerStart=useRef<number|null>(null);
  const [elapsed,setElapsed]=useState(0);
  const recording=speech.session.state==="recording";

  useEffect(()=>{
    if(!recording){timerStart.current=null;setElapsed(0);return}
    timerStart.current=Date.now();
    const id=window.setInterval(()=>setElapsed(Math.floor((Date.now()-(timerStart.current||Date.now()))/1000)),250);
    return()=>window.clearInterval(id);
  },[recording]);

  useEffect(()=>{
    const stop=()=>{if(recording)void stopSpeech()};
    const onVisibility=()=>{if(document.visibilityState==="hidden")stop()};
    window.addEventListener("blur",stop);
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{window.removeEventListener("blur",stop);document.removeEventListener("visibilitychange",onVisibility)};
  },[recording,stopSpeech]);

  const start=useCallback(()=>{if(settings.language==="auto")return;sessionProcessingMode.current=settings.processingMode;setSaveError("");setSaved(false);void startSpeech(settings.language)},[settings.language,settings.processingMode,startSpeech]);
  const stop=useCallback(()=>void stopSpeech(),[stopSpeech]);
  const activate=useCallback((e?:React.PointerEvent)=>{
    if(settings.recordingMode==="push_to_talk"){e?.preventDefault();if(!recording){push.current=true;start()}}
    else if(!recording)start();else stop();
  },[settings.recordingMode,recording,start,stop]);
  const release=useCallback(()=>{if(settings.recordingMode==="push_to_talk"&&push.current){push.current=false;stop()}},[settings.recordingMode,stop]);

  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      const el=e.target as HTMLElement|null;
      if(el?.matches("input,textarea,[contenteditable=true]")||e.repeat)return;
      const shortcut=settings.shortcut;
      const match=shortcut==="Space"?e.code==="Space":shortcut.startsWith("Ctrl+")?e.ctrlKey&&e.code===shortcut.slice(5):shortcut.startsWith("Alt+")?e.altKey&&e.code===shortcut.slice(4):e.key===shortcut;
      if(!match)return;
      e.preventDefault();
      if(settings.recordingMode==="push_to_talk"){push.current=true;start()}else activate();
    };
    const up=(e:KeyboardEvent)=>{if(e.code==="Space"||e.key===settings.shortcut)release()};
    window.addEventListener("keydown",key);window.addEventListener("keyup",up);
    return()=>{window.removeEventListener("keydown",key);window.removeEventListener("keyup",up)};
  },[settings.shortcut,settings.recordingMode,start,activate,release]);

  const displayed=mergeText(speech.session.finalText,speech.session.interimText);
  const finalText=speech.session.finalText;
  const sessionText=editing?draft:finalText;

  useEffect(()=>{if(!editing){setDraft(finalText);setDirty(false)}},[finalText,editing]);

  useEffect(()=>{
    const guard=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=""}};
    window.addEventListener("beforeunload",guard);
    return()=>window.removeEventListener("beforeunload",guard);
  },[dirty]);

  useEffect(()=>{
    const session=speech.session;
    if(!settings.saveTranscripts||session.state!=="processing"||!session.finalText||savedSessionId.current===session.id||savingRef.current)return;
    savingRef.current=true;
    setSaving(true);setSaved(false);setSaveError("");
    void getHistoryService().createSession({
      language:session.language,
      processingMode:sessionProcessingMode.current,
      rawText:session.rawFinalText,
      processedText:session.finalText,
      durationMs:session.startedAt?Date.now()-session.startedAt:undefined,
      source:"unknown",
    }).then(savedSession=>{
      savedSessionId.current=savedSession.id;
      setSaved(true);
      setDirty(false);
    }).catch(()=>{
      setSaveError("Transcript хадгалахад алдаа гарлаа. Одоогийн transcript устахгүй. Дахин хадгалж болно.");
    }).finally(()=>{
      savingRef.current=false;
      setSaving(false);
    });
  },[settings.saveTranscripts,speech.session,retrySave]);

  const mm=String(Math.floor(elapsed/60)).padStart(2,"0"),ss=String(elapsed%60).padStart(2,"0");
  const unsupported=!speech.supported;
  const error=speech.session.error;
  const uxState=getSessionUxState({speechState:speech.session.state,hasFinalText:Boolean(finalText),saving,saved,hasError:Boolean(error||saveError)});
  const label=uxState==="saving"?"ХАДГАЛЖ БАЙНА...":uxState==="saved"?"ХАДГАЛАГДСАН":uxState==="recording"?(speech.session.state==="stopping"?"ЗОГСООЖ БАЙНА...":"ЯРИЖ БАЙНА..."):uxState==="processing"?"БОЛОВСРУУЛЖ БАЙНА...":uxState==="error"?"ДАХИН ОРОЛДОХ":"ЯРЬЖ ЭХЛЭХ";
  const autoMessage=settings.language==="auto"?"Auto Detect нь энэ browser provider дээр дэмжигдээгүй. Монгол, English эсвэл 日本語 сонгоно уу.":null;

  return <section className="workspace">
    <div className="heading"><div><small>VOICE WORKSPACE</small><h1>Ярихыг текст болго.</h1><p>Бодит микрофон болон browser speech recognition ашиглана.</p></div><LanguageSelect value={settings.language} onChange={v=>update("language",v)}/></div>
    <div className="stage">
      <div className={recording?"halo pulse":"halo"}><button className={recording?"mic recording":"mic"} onPointerDown={activate} onPointerUp={release} onPointerCancel={release} disabled={speech.session.state==="requesting_permission"||speech.session.state==="stopping"||speech.session.state==="processing"} aria-label={label} aria-pressed={recording}><span>●</span></button></div>
      <strong aria-live="polite">{saving?"ХАДГАЛЖ БАЙНА...":saved?"ХАДГАЛАГДСАН":label}</strong>{recording&&<time>{mm}:{ss}</time>}
      {unsupported&&<p className="engine">Энэ browser SpeechRecognition API-г дэмжихгүй байна. Дараагийн cloud provider-д зориулсан provider boundary бэлэн.</p>}
      {autoMessage&&<p className="engine">{autoMessage}</p>}
      {error&&<div className="error" role="alert">{error.message}<button onClick={start}>Дахин оролдох</button></div>}
      {saveError&&<div className="history-notice" role="alert">{saveError}<button onClick={()=>{savedSessionId.current=null;setSaveError("");setRetrySave(value=>value+1);}}>Retry save</button></div>}
      {saved&&<div className="history-notice" role="status">Transcript History-д хадгалагдлаа.</div>}
    </div>
    <section className="transcript" aria-live="polite">
      <header><b>Transcript</b><span>{speech.session.interimText?"Interim":"Final"}</span></header>
      <div className="transcript-body">{speech.session.state==="processing"?<div className="empty">Transcript-ийг дуусгаж байна...</div>:editing?<textarea aria-label="Edit transcript" autoFocus value={draft} onChange={e=>{setDraft(e.target.value);setDirty(true)}} placeholder="Transcript энд харагдана."/>:displayed?<p className="transcript-text">{speech.session.finalText}<span className="interim">{speech.session.interimText}</span></p>:<div className="empty"><b>Таны текст энд гарна.</b><small>Ярьж эхлэхэд interim transcript, дараа нь final transcript бодитоор орж ирнэ.</small></div>}</div>
      <footer>
      <button onClick={()=>{setDraft(finalText);setEditing(true);setDirty(false)}} disabled={!finalText||saving}>Edit</button>
      <button onClick={async()=>{if(!sessionText)return;try{await navigator.clipboard?.writeText(sessionText);setCopyState("copied");window.setTimeout(()=>setCopyState("idle"),1600)}catch{setCopyState("failed")}}} disabled={!sessionText||saving}>{copyState==="copied"?"Copied":copyState==="failed"?"Copy failed":"Copy"}</button>
      <button onClick={async()=>{if(!editing)return;const id=savedSessionId.current;if(!id){setEditing(false);setDirty(false);return}setSaving(true);setSaveError("");try{await getHistoryService().updateSession(id,{processedText:draft});setEditing(false);setDirty(false);setSaved(true)}catch{setSaveError("Өөрчлөлтийг хадгалж чадсангүй.")}finally{setSaving(false)}}} disabled={!editing||saving}>{saving?"Saving…":"Save"}</button>
      <button onClick={()=>{if(dirty&&!window.confirm("Unsaved changes will be lost. Continue?"))return;setDraft("");setEditing(false);setDirty(false);void speech.abort()}} disabled={!finalText&&!speech.session.interimText}>Clear</button>
    </footer>
    </section>
    <div className="session-actions">{saved&&savedSessionId.current&&<Link href={`/history/${savedSessionId.current}`}>Open transcript</Link>}<Link href="/history">View history</Link><Link href="/recording">New recording</Link>{dirty&&<span aria-live="polite">Unsaved changes</span>}</div>
    <div className="meta">Shortcut <kbd>{settings.shortcut}</kbd><span>Mode <b>{settings.recordingMode}</b></span><span>Provider <b>{speech.supported?"Available":"Unavailable"}</b></span></div>
  </section>;
}
