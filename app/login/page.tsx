"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth/context";
import {AuthError} from "@/lib/auth/types";

export default function LoginPage(){
 const router=useRouter(); const {status,user,signIn}=useAuth();
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
 useEffect(()=>{if(status==="authenticated"&&user)router.replace("/dashboard")},[status,user,router]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setError("");if(!email.trim()||!password){setError("Email болон password оруулна уу.");return}setLoading(true);try{await signIn(email,password);router.replace("/dashboard")}catch(err){setError(err instanceof AuthError?err.message:"Нэвтрэх үед алдаа гарлаа.")}finally{setLoading(false)}};
 return <section className="auth-page"><div className="auth-card"><small>VOICE ACCOUNT</small><h1>Нэвтрэх</h1><p>Cloud history ашиглахын тулд Supabase account-аараа нэвтэрнэ.</p><form onSubmit={submit} noValidate><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{error&&<div className="auth-error" role="alert" aria-live="polite">{error}</div>}<button className="primary-action auth-submit" disabled={loading}>{loading?"Signing in…":"Sign in"}</button></form><p className="auth-switch">Account байхгүй юу? <Link href="/signup">Sign up</Link></p></div></section>;
}
