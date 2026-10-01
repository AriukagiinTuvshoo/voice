"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {getHistoryService} from "@/lib/history/service";
import {getPersistenceMode} from "@/lib/history/persistence";
import {useAuth} from "@/lib/auth/context";
import type {TranscriptSession} from "@/lib/history/types";
import {getDashboardStats} from "@/lib/dashboard/stats";
function relativeDate(value:string){const date=new Date(value),diff=Date.now()-date.getTime(),day=86400000;if(diff<60000)return "Just now";if(diff<day)return `${Math.max(1,Math.floor(diff/3600000))}h ago`;if(diff<7*day)return `${Math.floor(diff/day)}d ago`;try{return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(date)}catch{return value}}
export default function Dashboard(){
 const {status,user}=useAuth(); const cloud=getPersistenceMode()==="cloud";
 const [sessions,setSessions]=useState<TranscriptSession[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{if(cloud&&(status==="loading"||status==="unauthenticated"||status==="error")){setLoading(false);return}let active=true;setLoading(true);void getHistoryService().listSessions().then(items=>{if(active)setSessions(items)}).catch(()=>{if(active)setError(cloud?"Cloud history унших боломжгүй байна. Authentication болон Supabase configuration-оо шалгана уу.":"Recent sessions ачаалж чадсангүй.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[cloud,status]);
 const recent=useMemo(()=>sessions.slice(0,5),[sessions]);const stats=getDashboardStats(sessions);
 return <section className="page dashboard-page">
  <div className="dashboard-hero"><div><small>VOICE DASHBOARD</small><h1>Өнөөдөр юу ярих вэ?</h1><p>{cloud?"Authenticated cloud history ашиглан transcript-ээ хадгалж, өөрийн session-уудаа эндээс нээнэ.":"Шинэ recording эхлүүлээд finalized transcript-ээ шууд History-д хадгал."}</p></div><Link href="/recording" className="dashboard-primary">＋ New recording</Link></div>
  {cloud&&status==="loading"&&<div className="history-notice" role="status">Authentication session шалгаж байна...</div>}
  {cloud&&status==="unauthenticated"&&<div className="history-notice" role="status">Cloud history requires authentication. <Link href="/login">Sign in</Link> to access your own history.</div>}
  {user&&<div className="account-banner"><span>Signed in as</span><strong>{user.email??"Authenticated user"}</strong></div>}
  {error&&<div className="history-notice" role="alert">{error}</div>}
  <div className="stats-grid" aria-label="Local recording statistics"><div className="stat-card"><span>Total recordings</span><strong>{loading?"—":sessions.length}</strong></div><div className="stat-card"><span>This week</span><strong>{loading?"—":stats.thisWeek}</strong></div><div className="stat-card"><span>Transcript time</span><strong>{loading?"—":`${Math.floor(stats.totalDurationMs/60000)}m`}</strong></div></div>
  <div className="dashboard-section-head"><div><small>RECENT</small><h2>Recent sessions</h2></div><Link href="/history">View all</Link></div>
  {loading?<div className="dashboard-loading" aria-live="polite">Recent sessions ачаалж байна...</div>:cloud&&status!=="authenticated"?<div className="dashboard-empty"><div>⌁</div><h2>Sign in for cloud history</h2><p>Recording/processing нь үргэлжилж болно. Cloud save хийх үед authentication шаардлагатай.</p><Link href="/login" className="dashboard-primary">Sign in</Link></div>:recent.length===0?<div className="dashboard-empty"><div>◌</div><h2>No recordings yet</h2><p>Анхны transcript-ээ хадгалаад өдөр тутмын history-гээ эндээс үргэлжлүүл.</p><Link href="/recording" className="dashboard-primary">Start recording</Link></div>:<div className="recent-list">{recent.map(item=><Link key={item.id} href={`/history/${item.id}`} className="recent-item"><div><h3>{item.title}</h3><p>{item.processedText||"No transcript text"}</p></div><div className="recent-meta"><time dateTime={item.updatedAt}>{relativeDate(item.updatedAt)}</time><span>{item.language}</span></div></Link>)}</div>}
 </section>;
}
