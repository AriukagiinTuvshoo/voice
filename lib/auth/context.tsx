"use client";
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from "react";
import {getAuthService} from "./service";
import {AuthError,type AuthState,type AuthSession} from "./types";
import {getPersistenceMode} from "@/lib/history/persistence";
import {hasSupabaseBrowserConfig} from "@/lib/history/supabase";

type AuthContextValue=AuthState&{signIn:(email:string,password:string)=>Promise<void>;signUp:(email:string,password:string)=>Promise<AuthSession|null>;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthContextValue|null>(null);

export function AuthProvider({children}:{children:ReactNode}){
 const [state,setState]=useState<AuthState>({status:"loading",user:null,session:null,error:null});
 const service=useMemo(()=>getAuthService(),[]);
 useEffect(()=>{
  let active=true;
  const configured=hasSupabaseBrowserConfig();
  if(!configured){
   setState({status:getPersistenceMode()==="local"?"unauthenticated":"error",user:null,session:null,error:getPersistenceMode()==="local"?null:new AuthError("configuration_error","Authentication configuration дутуу байна.")});
   return;
  }
  void service.getSession().then(session=>{if(active)setState({status:session?"authenticated":"unauthenticated",user:session?.user??null,session,error:null})}).catch(error=>{if(active)setState({status:"error",user:null,session:null,error:error instanceof AuthError?error:new AuthError("unknown_error","Authentication session ачаалж чадсангүй.",{cause:error})})});
  let unsubscribe=()=>{};
  try{
   unsubscribe=service.onAuthStateChange((_event,session)=>{if(active)setState({status:session?"authenticated":"unauthenticated",user:session?.user??null,session,error:null})});
  }catch(error){
   if(active)setState({status:"error",user:null,session:null,error:error instanceof AuthError?error:new AuthError("configuration_error","Authentication configuration дутуу байна.",{cause:error})});
  }
  return()=>{active=false;unsubscribe()};
 },[service]);

 const value=useMemo<AuthContextValue>(()=>({
  ...state,
  signIn:async(email,password)=>{setState(s=>({...s,status:"loading",error:null}));try{const session=await service.signIn(email,password);setState({status:"authenticated",user:session.user,session,error:null})}catch(error){const normalized=error instanceof AuthError?error:new AuthError("unknown_error","Нэвтрэх үед алдаа гарлаа.",{cause:error});setState(s=>({...s,status:"unauthenticated",error:normalized}));throw normalized}},
  signUp:async(email,password)=>{setState(s=>({...s,status:"loading",error:null}));try{const session=await service.signUp(email,password);setState({status:session?"authenticated":"unauthenticated",user:session?.user??null,session,error:null});return session}catch(error){const normalized=error instanceof AuthError?error:new AuthError("unknown_error","Бүртгэл үүсгэх үед алдаа гарлаа.",{cause:error});setState(s=>({...s,status:"unauthenticated",error:normalized}));throw normalized}},
  signOut:async()=>{setState(s=>({...s,status:"loading",error:null}));try{await service.signOut();setState({status:"unauthenticated",user:null,session:null,error:null})}catch(error){const normalized=error instanceof AuthError?error:new AuthError("unknown_error","Гарах үед алдаа гарлаа.",{cause:error});setState(s=>({...s,status:"authenticated",error:normalized}));throw normalized}}
 }),[service,state]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error("useAuth must be used inside AuthProvider");return value}
