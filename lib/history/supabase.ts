import {createClient,type SupabaseClient} from "@supabase/supabase-js";
import {PersistenceError} from "./persistence-error";
let browserClient:SupabaseClient|undefined;
export function createSupabaseBrowserClient():SupabaseClient{
  if(browserClient)return browserClient;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new PersistenceError("configuration_error","Supabase cloud persistence is not configured.");
  try{browserClient=createClient(url,key);return browserClient;}catch(cause){throw new PersistenceError("configuration_error","Supabase configuration is invalid.",{cause});}
}
