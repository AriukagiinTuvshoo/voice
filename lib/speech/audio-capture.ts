import {normalizeSpeechError} from "./errors";
export interface AudioCapture{start():Promise<void>;stop():Promise<Blob|null>;abort():Promise<void>;isRecording():boolean}
export class BrowserAudioCapture implements AudioCapture{
 private stream:MediaStream|null=null;private recorder:MediaRecorder|null=null;private chunks:Blob[]=[];private active=false;
 async start(){if(typeof navigator==="undefined"||!navigator.mediaDevices?.getUserMedia)throw normalizeSpeechError({error:"audio-capture"});try{this.stream=await navigator.mediaDevices.getUserMedia({audio:true});this.chunks=[];this.active=true;if(typeof MediaRecorder!=="undefined"){this.recorder=new MediaRecorder(this.stream);this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data)};this.recorder.start()}}catch(error){this.release();throw normalizeSpeechError(error)}}
 async stop(){if(!this.active)return null;const recorder=this.recorder;const blobPromise=recorder?new Promise<Blob|null>(resolve=>{recorder.onstop=()=>resolve(this.chunks.length?new Blob(this.chunks,{type:recorder.mimeType||"audio/webm"}):null);recorder.stop()}):Promise.resolve(null);const blob=await blobPromise;this.release();return blob}
 async abort(){try{if(this.recorder&&this.recorder.state!=="inactive")this.recorder.stop()}finally{this.release()}}
 isRecording(){return this.active}
 private release(){this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;this.recorder=null;this.chunks=[];this.active=false}
}