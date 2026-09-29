"use client";
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from "react";import type {Settings} from "@/lib/types";
export const defaultSettings:Settings={language:"mn",recordingMode:"toggle",shortcut:"Space",autoStop:false,autoPunctuation:true,autoCorrection:true,removeFillers:false,processingMode:"standard",theme:"system",saveRecordings:true,saveTranscripts:true};
type SettingsContextValue={settings:Settings;update:<K extends keyof Settings>(key:K,value:Settings[K])=>void};
const SettingsContext=createContext<SettingsContextValue|null>(null);
export function useSettings(){const value=useContext(SettingsContext);if(!value)throw new Error("useSettings must be used inside SettingsProvider");return value}
export function SettingsProvider({children}:{children:ReactNode}){const [settings,setSettings]=useState<Settings>(defaultSettings);
useEffect(()=>{try{const raw=localStorage.getItem("voice-settings");if(raw)setSettings({...defaultSettings,...JSON.parse(raw)})}catch{}},[]);
useEffect(()=>{try{localStorage.setItem("voice-settings",JSON.stringify(settings))}catch{}},[settings]);
useEffect(()=>{const root=document.documentElement;const apply=()=>{root.dataset.theme=settings.theme==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):settings.theme};apply();if(settings.theme!=="system")return;const media=matchMedia("(prefers-color-scheme: dark)");media.addEventListener("change",apply);return()=>media.removeEventListener("change",apply)},[settings.theme]);
const value=useMemo(()=>({settings,update:<K extends keyof Settings>(key:K,value:Settings[K])=>setSettings(s=>({...s,[key]:value}))}),[settings]);
return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>}