"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {createContext,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from "react";
import {languages,recordingModes,shortcuts,modes,themes} from "@/lib/constants";
import type {Language,RecordingState,Settings,Shortcut} from "@/lib/types";

const defaults:Settings={language:"mn",recordingMode:"toggle",shortcut:"Space",autoStop:false,autoPunctuation:true,autoCorrection:true,removeFillers:false,processingMode:"standard",theme:"system",saveRecordings:true,saveTranscripts:true};
type Ctx={settings:Settings;update:<K extends keyof Settings>(k:K,v:Settings[K])=>void};
const SettingsContext=createContext<Ctx|null>(null);
export function useSettings(){const c=useContext(SettingsContext);if(!c)throw new Error("useSettings must be used inside AppShell");return c}

function Provider({children}:{children:ReactNode}){
 const [settings,setSettings]=useState<Settings>(defaults);
 useEffect(()=>{try{const x=localStorage.getItem("voice-settings");if(x)setSettings({...defaults,...JSON.parse(x)})}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("voice-settings",JSON.stringify(settings))}catch{}},[settings]);
 useEffect(()=>{const root=document.documentElement;const apply=()=>{root.dataset.theme=settings.theme==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):settings.theme};apply();if(settings.theme!=="system")return;const m=matchMedia("(prefers-color-scheme: dark)");m.addEventListener("change",apply);return()=>m.removeEventListener("change",apply)},[settings.theme]);
 const value=useMemo(()=>({settings,update:<K extends keyof Settings>(k:K,v:Settings[K])=>setSettings(s=>({...s,[k]:v}))}),[settings]);
 return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
const nav=[["/dashboard","＋","New"],["/history","◷","History"],["/settings","⚙","Settings"]];
export function AppShell({children}:{children:ReactNode}){
 return <Provider><Shell>{children}</Shell></Provider>
}
function Shell({children}:{children:ReactNode}){
 const path=usePathname();const {settings,update}=useSettings();
 return <div className="shell"><aside className="sidebar"><Link href="/dashboard" className="brand">VOICE</Link><nav>{nav.map(([href,icon,label])=><Link key={href} href={href} className={path===href?"nav active":"nav"}><span>{icon}</span>{label}</Link>)}</nav><div className="side-note"><i/>Speech engine ready for integration</div></aside><main className="main"><header className="topbar"><b className="mobile-brand">VOICE</b><Language value={settings.language} onChange={v=>update("language",v)}/></header>{children}</main><nav className="mobile-nav">{nav.map(([href,icon,label])=><Link key={href} href={href} className={path===href?"mnav active":"mnav"}><span>{icon}</span>{label}</Link>)}</nav></div>
}
function Language({value,onChange}:{value:Language;onChange:(v:Language)=>void}){
 return <label className="language"><span className="sr">Language</span><select value={value} onChange={e=>onChange(e.target.value as Language)}>{languages.map(x=><option key={x.value} value={x.value}>{x.icon} {x.label}</option>)}</select></label>
}

export function Workspace(){
 const {settings,update}=useSettings();const [state,setState]=useState<RecordingState>("idle");const [seconds,setSeconds]=useState(0);const [text,setText]=useState("");const [editing,setEditing]=useState(false);const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 useEffect(()=>{if(state==="recording"){timer.current=setInterval(()=>setSeconds(s=>s+1),1000)}else if(timer.current){clearInterval(timer.current);timer.current=null}return()=>{if(timer.current)clearInterval(timer.current)}},[state]);
 const toggle=()=>{if(state==="idle"||state==="error"){setSeconds(0);setState("recording")}else if(state==="recording"){setState("processing");window.setTimeout(()=>setState("success"),450)}};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const el=e.target as HTMLElement|null;if(el?.matches("input,textarea,[contenteditable=true]")||e.repeat)return;const s=settings.shortcut;const ok=s==="Space"?e.code==="Space":s.startsWith("Ctrl+")?e.ctrlKey&&e.code===s.slice(5):s.startsWith("Alt+")?e.altKey&&e.code===s.slice(4):e.key===s;if(ok){e.preventDefault();toggle()}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[settings.shortcut,state]);
 const label=state==="idle"?"ЯРЬЖ ЭХЛЭХ":state==="recording"?"ЯРИЖ БАЙНА...":state==="processing"?"БОЛОВСРУУЛЖ БАЙНА...":state==="error"?"ДАХИН ОРОЛДОХ":"БИЧЛЭГ БЭЛЭН";
 const mm=String(Math.floor(seconds/60)).padStart(2,"0"),ss=String(seconds%60).padStart(2,"0");
 return <section className="workspace"><div className="heading"><div><small>VOICE WORKSPACE</small><h1>Ярихыг текст болго.</h1><p>Монгол, English, 日本語 хэлээр ярьж эхлээрэй.</p></div><Language value={settings.language} onChange={v=>update("language",v)}/></div>
 <div className="stage"><div className={state==="recording"?"halo pulse":"halo"}><button className={state==="recording"?"mic recording":"mic"} onClick={toggle} disabled={state==="processing"} aria-label={label} aria-pressed={state==="recording"}><span>●</span></button></div><strong>{label}</strong>{state==="recording"&&<time>{mm}:{ss}</time>}<p className="engine">Speech recognition engine is not connected yet. This phase never generates fake transcript data.</p></div>
 {state==="error"&&<div className="error" role="alert">Бичлэг эхлүүлэхэд алдаа гарлаа. Дахин оролдоно уу.</div>}
 <section className="transcript"><header><b>Transcript</b><span>Local state only</span></header><div className="transcript-body">{state==="processing"?<div className="empty">Боловсруулж байна...</div>:editing?<textarea autoFocus value={text} onChange={e=>setText(e.target.value)} placeholder="Transcript энд харагдана."/>:text?<p className="transcript-text">{text}</p>:<div className="empty"><b>Таны текст энд гарна.</b><small>Speech recognition холбогдсоны дараа бодит transcript энд орно.</small></div>}</div><footer><button onClick={()=>setEditing(true)} disabled={!text}>Edit</button><button onClick={()=>text&&navigator.clipboard?.writeText(text)} disabled={!text}>Copy</button><button onClick={()=>setEditing(false)} disabled={!editing}>Save</button><button onClick={()=>{setText("");setEditing(false);setState("idle");setSeconds(0)}} disabled={!text}>Delete</button></footer></section>
 <div className="meta">Shortcut <kbd>{settings.shortcut}</kbd><span>Mode <b>{settings.recordingMode}</b></span><span>Processing <b>{settings.processingMode}</b></span></div></section>
}

export function SettingsPanel(){
 const {settings,update}=useSettings();
 const Toggle=({k,label}:{k:keyof Settings;label:string})=><label className="toggle"><span>{label}</span><input type="checkbox" checked={Boolean(settings[k])} onChange={e=>update(k,e.target.checked as never)}/></label>;
 return <div className="settings-grid">
 <section className="settings"><h2>Language</h2><p>Үндсэн хэл болон Auto Detect.</p><Toggle k="autoPunctuation" label="Auto detect is represented by language selector"/><div className="option-list"><label><input type="radio" checked={settings.language==="mn"} onChange={()=>update("language","mn")}/> 🇲🇳 Монгол</label><label><input type="radio" checked={settings.language==="auto"} onChange={()=>update("language","auto")}/> 🌐 Auto Detect</label></div></section>
 <section className="settings"><h2>Recording</h2><p>Бичлэгийн үндсэн үйлдэл.</p>{recordingModes.map(x=><label className="radio" key={x.value}><input type="radio" name="mode" checked={settings.recordingMode===x.value} onChange={()=>update("recordingMode",x.value)}/><span><b>{x.label}</b><small>{x.description}</small></span></label>)}<Toggle k="autoStop" label="Auto stop"/></section>
 <section className="settings"><h2>Keyboard</h2><p>Зөвхөн VOICE app дотор үйлчилнэ.</p><select value={settings.shortcut} onChange={e=>update("shortcut",e.target.value as Shortcut)}>{shortcuts.map(x=><option key={x}>{x}</option>)}</select></section>
 <section className="settings"><h2>Text</h2><p>Ирээдүйн processor-ийн typed foundation.</p><Toggle k="autoPunctuation" label="Auto punctuation"/><Toggle k="autoCorrection" label="Auto correction"/><Toggle k="removeFillers" label="Remove fillers"/><div className="option-list">{modes.map(x=><label className="radio" key={x.value}><input type="radio" name="processing" checked={settings.processingMode===x.value} onChange={()=>update("processingMode",x.value)}/><span><b>{x.label}</b><small>{x.description}</small></span></label>)}</div></section>
 <section className="settings"><h2>Appearance</h2><p>Theme preference.</p><div className="themes">{themes.map(x=><button key={x.value} className={settings.theme===x.value?"selected":""} onClick={()=>update("theme",x.value)}>{x.label}</button>)}</div></section>
 <section className="settings"><h2>Privacy</h2><p>Persistence controls for future storage.</p><Toggle k="saveRecordings" label="Save recordings"/><Toggle k="saveTranscripts" label="Save transcripts"/></section>
 </div>
}