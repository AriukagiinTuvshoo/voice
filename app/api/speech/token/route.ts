import {normalizeSpeechError} from "../../../../lib/speech/errors";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const regionPattern=/^[a-z0-9-]+$/i;

function json(body:unknown,status:number,extraHeaders?:Record<string,string>){
  return Response.json(body,{status,headers:{"Cache-Control":"no-store",...extraHeaders}});
}

export async function GET(){
  return json({error:"method_not_allowed"},405,{"Allow":"POST"});
}

export async function POST(request:Request){
  const origin=request.headers.get("origin");
  const requestOrigin=new URL(request.url).origin;
  if(!origin||origin!==requestOrigin){
    return json({error:"provider_unavailable"},403);
  }

  const key=process.env.AZURE_SPEECH_KEY?.trim();
  const region=process.env.AZURE_SPEECH_REGION?.trim();

  if(!key||!region||!regionPattern.test(region)){
    return json({error:"provider_unavailable"},503);
  }

  try{
    const response=await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method:"POST",
        headers:{
          "Ocp-Apim-Subscription-Key":key,
          "Content-Type":"application/x-www-form-urlencoded",
          "Content-Length":"0"
        },
        body:"",
        cache:"no-store",
        signal:AbortSignal.timeout(5000)
      }
    );

    if(!response.ok){
      return json({error:"provider_unavailable"},502);
    }

    const token=(await response.text()).trim();
    if(!token){
      return json({error:"provider_unavailable"},502);
    }

    return json({token,region},200);
  }catch(error){
    const normalized=normalizeSpeechError(error);
    const status=normalized.code==="network_error"?504:502;
    return json({error:normalized.code},status);
  }
}
