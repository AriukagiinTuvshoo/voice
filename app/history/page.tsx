"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {getHistoryService} from "@/lib/history/service";
import {searchTranscriptSessions} from "@/lib/history/search";
import type {TranscriptSession} from "@/lib/history/types";

function formatDate(value:string){
  try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}
  catch{return value;}
}

export default function History(){
  const [sessions,setSessions]=useState<TranscriptSession[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    void getHistoryService().listSessions().then(items=>{if(active)setSessions(items)}).catch(()=>{if(active)setError("History унших боломжгүй байна. Browser storage-г шалгана уу.")}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  const filtered=useMemo(()=>searchTranscriptSessions(sessions,query),[sessions,query]);

  const remove=async(id:string)=>{
    if(!window.confirm("Энэ transcript-ийг устгах уу?"))return;
    try{
      await getHistoryService().deleteSession(id);
      setSessions(current=>current.filter(session=>session.id!==id));
    }catch{setError("Transcript устгахад алдаа гарлаа.")}
  };

  return <section className="page">
    <div className="history-heading"><div><small>VOICE HISTORY</small><h1>Түүх</h1><p>Хадгалсан transcript-уудаа хайж, нээж, устгаж болно.</p></div><Link className="primary-action" href="/dashboard">＋ New transcript</Link></div>
    <div className="history-toolbar"><label className="history-search"><span className="sr">Search transcripts</span><input aria-label="Search transcripts" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title or transcript..." type="search"/>{query&&<button className="search-clear" onClick={()=>setQuery("")} aria-label="Clear search">Clear</button>}</label><span className="history-count" aria-live="polite">{filtered.length} result{filtered.length===1?"":"s"}</span></div>
    {error&&<div className="history-notice" role="alert">{error}</div>}
    {loading?<div className="history-state">History ачаалж байна...</div>:!sessions.length?<div className="empty-page history-empty"><div>◌</div><h2>No transcripts yet</h2><p>Ярьж эхлээд finalized transcript хадгалмагц энд харагдана.</p><Link className="primary-action" href="/dashboard">Record transcript</Link></div>:!filtered.length?<div className="history-state"><h2>No results</h2><p>“{query}” хайлтад тохирох transcript олдсонгүй.</p></div>:<div className="history-list">{filtered.map(session=><article className="history-card" key={session.id}><Link href={`/history/${session.id}`} className="history-card-main"><div className="history-card-top"><h2>{session.title}</h2><time dateTime={session.createdAt}>{formatDate(session.createdAt)}</time></div><p>{session.processedText||"No transcript text"}</p><div className="history-card-meta"><span>{session.language}</span><span>{session.processingMode}</span>{session.durationMs!==undefined&&<span>{Math.round(session.durationMs/1000)}s</span>}</div></Link><button className="icon-action" onClick={()=>void remove(session.id)} aria-label={`Delete ${session.title}`}>Delete</button></article>)}</div>}
  </section>;
}
