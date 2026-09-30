"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {getHistoryService} from "@/lib/history/service";
import type {TranscriptSession} from "@/lib/history/types";

function formatDate(value:string){
  try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}
  catch{return value;}
}

export default function HistoryDetail(){
  const params=useParams<{id:string}>();
  const router=useRouter();
  const id=params?.id ?? "";
  const [session,setSession]=useState<TranscriptSession|null>(null);
  const [title,setTitle]=useState("");
  const [text,setText]=useState("");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    setLoading(true);
    void getHistoryService().getSession(id).then(item=>{
      if(!active)return;
      setSession(item);setTitle(item?.title ?? "");setText(item?.processedText ?? "");
    }).catch(()=>{if(active)setError("Transcript унших боломжгүй байна.")}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[id]);

  const save=async()=>{
    if(!session)return;
    setSaving(true);setError("");
    try{
      const updated=await getHistoryService().updateSession(session.id,{title,processedText:text});
      setSession(updated);setTitle(updated.title);setText(updated.processedText);
    }catch{setError("Өөрчлөлтийг хадгалж чадсангүй.")}finally{setSaving(false)}
  };

  const copy=async()=>{
    if(!text)return;
    try{await navigator.clipboard?.writeText(text)}catch{setError("Clipboard-д хуулж чадсангүй.")}
  };

  const remove=async()=>{
    if(!session||!window.confirm("Энэ transcript-ийг устгах уу?"))return;
    try{await getHistoryService().deleteSession(session.id);router.push("/history")}catch{setError("Transcript устгахад алдаа гарлаа.")}
  };

  if(loading)return <section className="page"><Link className="back-link" href="/history">← History</Link><div className="history-state">Transcript ачаалж байна...</div></section>;
  if(!session)return <section className="page"><Link className="back-link" href="/history">← History</Link><div className="history-state"><h1>Transcript олдсонгүй</h1><p>Энэ history item байхгүй эсвэл устсан байна.</p></div></section>;

  return <section className="page">
    <div className="detail-top"><Link className="back-link" href="/history">← History</Link><button className="danger-action" onClick={()=>void remove()}>Delete</button></div>
    <div className="detail-heading"><div><small>TRANSCRIPT</small><h1>Transcript detail</h1><p>{formatDate(session.createdAt)} · {session.language} · {session.processingMode}</p></div></div>
    {error&&<div className="history-notice" role="alert">{error}</div>}
    <section className="detail-card">
      <label className="field-label" htmlFor="history-title">Title</label>
      <input id="history-title" className="detail-title-input" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/>
      <label className="field-label" htmlFor="history-text">Processed transcript</label>
      <textarea id="history-text" className="detail-editor" value={text} onChange={e=>setText(e.target.value)} aria-describedby="raw-transcript-note"/>
      <div className="detail-actions"><button onClick={()=>void copy()} disabled={!text}>Copy</button><button className="primary-action" onClick={()=>void save()} disabled={saving}>{saving?"Saving...":"Save changes"}</button></div>
    </section>
    <details className="raw-panel"><summary>View original raw transcript</summary><p id="raw-transcript-note">{session.rawText||"No raw transcript text."}</p></details>
  </section>;
}
