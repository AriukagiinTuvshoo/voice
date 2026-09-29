import type {SpeechError,SpeechErrorCode} from "./types";

export function normalizeSpeechError(error:unknown):SpeechError{
 const raw=typeof error==="object"&&error!==null?error as {error?:unknown;name?:unknown;message?:unknown}: {};
 const name=raw.error?String(raw.error):raw.name?String(raw.name):"";
 const message=raw.message?String(raw.message):"";
 const code:SpeechErrorCode=name==="not-allowed"||name==="service-not-allowed"||name==="NotAllowedError"?"permission_denied":name==="audio-capture"||name==="NotFoundError"?"microphone_unavailable":name==="network"?"network_error":name==="language-not-supported"?"language_not_supported":name==="aborted"?"provider_unavailable":name==="unsupported"?"browser_unsupported":name==="provider-unavailable"?"provider_unavailable":name==="network-error"?"network_error":name==="recognition-error"?"recognition_error":name==="audio-capture-error"?"audio_capture_error":message.toLowerCase().includes("timeout")?"network_error":name?"recognition_error":"unknown_error";
 const messages:Record<SpeechErrorCode,string>={permission_denied:"Микрофоны зөвшөөрөл шаардлагатай.",microphone_unavailable:"Ашиглах боломжтой микрофон олдсонгүй.",browser_unsupported:"Энэ browser speech recognition-ийг дэмжихгүй байна.",provider_unavailable:"Speech recognition provider ажиллах боломжгүй байна.",network_error:"Speech recognition service-тэй холбогдоход алдаа гарлаа.",recognition_error:"Speech recognition алдаа гарлаа. Дахин оролдоно уу.",audio_capture_error:"Микрофоны audio stream үүсгэхэд алдаа гарлаа.",language_not_supported:"Сонгосон хэл энэ speech provider дээр дэмжигдэхгүй байна.",unknown_error:"Speech recognition-д тодорхойгүй алдаа гарлаа."};
 return {code,message:messages[code],cause:error};
}
