"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/lib/auth/context";
import {AuthError} from "@/lib/auth/types";

export default function SignupPage(){
 const router=useRouter(); const {status,user,signUp}=useAuth();
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [error,setError]=useState(""); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
 useEffect(()=>{if(status==="authenticated"&&user)router.replace("/dashboard")},[status,user,router]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setError("");setMessage("");if(!email.trim()||!password){setError("Email болон password оруулна уу.");return}if(password!==confirm){setError("Password-ууд ижил биш байна.");return}setLoading(true);try{const session=await signUp(email,password);if(session)router.replace("/dashboard");else setMessage("Бүртгэл үүслээ. Email баталгаажуулах шаардлагатай бол inbox-оо шалгана уу.")}catch(err){setError(err instanceof AuthError?err.message:"Бүртгэл үүсгэх үед алдаа гарлаа.")}finally{setLoading(false)}};
 return <section className="auth-page"><div className="auth-card"><small>VOICE ACCOUNT</small><h1>Бүртгүүлэх</h1><p>Supabase Auth ашиглан VOICE account үүсгэнэ.</p><form onSubmit={submit} noValidate><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={6} required/></label><label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" minLength={6} required/></label>{error&&<div className="auth-error" role="alert" aria-live="polite">{error}</div>}{message&&<div className="history-notice" role="status" aria-live="polite">{message}</div>}<button className="primary-action auth-submit" disabled={loading}>{loading?"Creating…":"Create account"}</button></form><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></div></section>;
}
