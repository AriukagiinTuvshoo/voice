import type {Language, ProcessingMode} from "@/lib/types";

export interface TranscriptProcessingOptions {
  language: Language;
  mode: ProcessingMode;
  autoPunctuation: boolean;
  autoCorrection: boolean;
  removeFillers: boolean;
}

export interface TranscriptProcessingResult {
  rawText: string;
  processedText: string;
  changed: boolean;
}

const FILLERS: Partial<Record<Exclude<Language, "auto">, string[]>> = {
  en: ["um", "uh", "erm", "er"],
  mn: ["ээ", "аа", "мм", "ммм"],
  ja: ["えー", "ええと", "えっと", "うーん"],
};

const SAFE_CORRECTIONS: Partial<Record<Exclude<Language, "auto">, Record<string, string>>> = {
  en: {im:"I'm", ive:"I've", id:"I'd", dont:"don't", cant:"can't", wont:"won't", youre:"you're", theyre:"they're", were:"we're", youve:"you've", doesnt:"doesn't", didnt:"didn't"},
};

function normalizeWhitespace(text:string):string{return text.replace(/\s+/g," ").trim();}
function normalizePunctuation(text:string):string{return text.replace(/\s+([,.!?;:])/g,"$1").replace(/([,.!?;:])(?=\S)/g,"$1 ").replace(/\s{2,}/g," ").trim();}
function addTerminalPunctuation(text:string,language:Language):string{
  if(!text||/[.!?。！？]$/.test(text)||text.split(" ").filter(Boolean).length<2)return text;
  return text+(language==="ja"?"。":".");
}
function applySafeCorrections(text:string,language:Language):string{
  if(language==="auto")return text;
  const corrections=SAFE_CORRECTIONS[language];
  if(!corrections)return text;
  return text.replace(/\b[A-Za-z']+\b/g,(word)=>corrections[word.toLowerCase()]??word);
}
function removeFillers(text:string,language:Language):string{
  if(language==="auto")return text;
  const fillers=FILLERS[language];
  if(!fillers?.length)return text;
  let result=text;
  for(const filler of fillers){
    const escaped=filler.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
    result=result.replace(new RegExp("(?:^|\\s)"+escaped+"(?=\\s|$)","giu")," ");
  }
  return normalizeWhitespace(result);
}
function removeSafeRepeatedWords(text:string,language:Language):string{
  if(language==="ja")return text;
  const words=text.split(" ");
  const output:string[]=[];
  for(const word of words){
    const previous=output[output.length-1];
    if(previous&&word.toLocaleLowerCase()===previous.toLocaleLowerCase()&&/^[\p{L}\p{N}'’-]+$/u.test(word))continue;
    output.push(word);
  }
  return output.join(" ");
}
function deterministicProcess(text:string,options:TranscriptProcessingOptions):string{
  if(options.mode==="raw")return text;
  let result=normalizeWhitespace(text);
  if(options.autoCorrection)result=applySafeCorrections(result,options.language);
  if(options.mode==="clean"||options.mode==="polished"){
    if(options.removeFillers)result=removeFillers(result,options.language);
    result=removeSafeRepeatedWords(result,options.language);
  }
  result=normalizePunctuation(result);
  if(options.autoPunctuation)result=addTerminalPunctuation(result,options.language);
  return result;
}
export function processTranscript(input:string,options:TranscriptProcessingOptions):TranscriptProcessingResult{
  const rawText=typeof input==="string"?input:"";
  try{
    const processedText=deterministicProcess(rawText,options);
    return {rawText,processedText,changed:processedText!==rawText};
  }catch{
    return {rawText,processedText:rawText,changed:false};
  }
}
