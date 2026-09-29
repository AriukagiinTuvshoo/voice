import type {Language} from "@/lib/types";
export const speechLanguageMap:Record<Exclude<Language,"auto">,string>={mn:"mn-MN",en:"en-US",ja:"ja-JP"};
export function toProviderLanguage(language:Language):string|undefined{return language==="auto"?undefined:speechLanguageMap[language]}