"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {createContext,useContext,useEffect,useMemo,useRef,useState,useCallback,type ReactNode} from "react";
import {languages,recordingModes,shortcuts,modes,themes} from "@/lib/constants";
import type {Language,Settings,Shortcut} from "@/lib/types";
import {VoiceWorkspace} from "@/components/recording/VoiceWorkspace";

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

export const Workspace=VoiceWorkspace;\n\nexport function SettingsPanel(){
 const {settings,update}=useSettings();
 const Toggle=({k,label}:{k:keyof Settings;label:string})=><label className="toggle"><span>{label}</span><input type="checkbox" checked={Boolean(settings[k])} onChange={e=>update(k,e.target.checked as never)}/></label>;
 return <div className="settings-grid">
 <section className="settings"><h2>Language</h2><p>Үндсэн хэлээ сонгоно. Auto Detect нь speech integration үед ашиглагдана.</p><Language value={settings.language} onChange={v=>update("language",v)}/></section>
 <section className="settings"><h2>Recording</h2><p>Бичлэгийн үндсэн үйлдэл.</p>{recordingModes.map(x=><label className="radio" key={x.value}><input type="radio" name="mode" checked={settings.recordingMode===x.value} onChange={()=>update("recordingMode",x.value)}/><span><b>{x.label}</b><small>{x.description}</small></span></label>)}<Toggle k="autoStop" label="Auto stop"/></section>
 <section className="settings"><h2>Keyboard</h2><p>Зөвхөн VOICE app дотор үйлчилнэ.</p><select value={settings.shortcut} onChange={e=>update("shortcut",e.target.value as Shortcut)}>{shortcuts.map(x=><option key={x}>{x}</option>)}</select></section>
 <section className="settings"><h2>Text</h2><p>Ирээдүйн processor-ийн typed foundation.</p><Toggle k="autoPunctuation" label="Auto punctuation"/><Toggle k="autoCorrection" label="Auto correction"/><Toggle k="removeFillers" label="Remove fillers"/><div className="option-list">{modes.map(x=><label className="radio" key={x.value}><input type="radio" name="processing" checked={settings.processingMode===x.value} onChange={()=>update("processingMode",x.value)}/><span><b>{x.label}</b><small>{x.description}</small></span></label>)}</div></section>
 <section className="settings"><h2>Appearance</h2><p>Theme preference.</p><div className="themes">{themes.map(x=><button key={x.value} className={settings.theme===x.value?"selected":""} onClick={()=>update("theme",x.value)}>{x.label}</button>)}</div></section>
 <section className="settings"><h2>Privacy</h2><p>Persistence controls for future storage.</p><Toggle k="saveRecordings" label="Save recordings"/><Toggle k="saveTranscripts" label="Save transcripts"/></section>
 </div>
}