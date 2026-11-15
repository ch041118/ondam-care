import {organizationOf} from './organization.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
export const recognitionFailure=message=>Object.assign(Error(message),{code:'VOICE_UNRECOGNIZED',status:422});
const mimeTypes=new Set(['audio/mp4','audio/aac','audio/webm']);
export function createVoiceFallback({getDb,save,dataDir,clock=Date.now,onFallback=()=>{}}){
 const busy=new Set();const directory=join(dataDir,'voice-recordings');
 const file=id=>{if(!/^[a-f0-9-]{36}$/.test(id))throw Error('녹음을 찾을 수 없습니다.');return join(directory,id+'.audio');};
 function recording(id){const r=getDb().requests.find(r=>r.id===id&&r.voiceReview);if(!r)throw Error('녹음을 찾을 수 없습니다.');return {mimeType:r.voiceReview.mimeType,audioBase64:readFileSync(file(r.id)).toString('base64')};}
 async function process({elderId,checkinId,audio,mime,attemptId,run}){
  const type=String(mime).split(';')[0].trim().toLowerCase();
  if(!mimeTypes.has(type)||!audio.length||audio.length>7*1024*1024)throw Error('녹음 파일 형식이나 길이를 확인해 주세요.');
  if(attemptId!==undefined&&(typeof attemptId!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(attemptId)))throw Error('녹음 요청 번호를 확인해 주세요.');
  const key=JSON.stringify([elderId,checkinId||'request']);
  if(busy.has(key))throw Object.assign(Error('앞서 말씀하신 내용을 확인 중이에요. 잠시 기다려 주세요.'),{status:409});
  busy.add(key);
  try{
   let db=getDb();db.voiceFailures||={};
   const digest=createHash('sha256').update(audio).digest('hex');
   const identity=attemptId||digest;
   let state=db.voiceFailures[key];
   // Replaying a failed upload must not count as a fresh recording.
   const previous=state?.attempts?.find(a=>a.id===identity);
   if(previous){if(previous.digest!==digest)throw Error('같은 녹음 요청 번호로 다른 파일을 보낼 수 없습니다.');if(state.requestId){const found=db.requests.find(r=>r.id===state.requestId);if(found)return found;}throw recognitionFailure('말씀을 잘 듣지 못했어요. 다시 꾹 누르고 말씀해 주세요.');}
   if(state?.lastAt&&clock()-state.lastAt>24*3600000)state=null;
   let result;
   try{result=await run();}
   catch(error){
    if(error.code!=='VOICE_UNRECOGNIZED')throw error;
    db=getDb();db.voiceFailures||={};
    const attempts=[...(state?.requestId?[]:state?.attempts||[]),{id:identity,digest}].slice(-3);
    if(attempts.length<3){db.voiceFailures[key]={attempts,lastAt:clock()};save();throw recognitionFailure(attempts.length===2?'말씀을 잘 듣지 못했어요. 한 번만 더 말씀해 주세요. 또 어려우면 담당 선생님이 녹음을 들을게요.':'말씀을 잘 듣지 못했어요. 다시 꾹 누르고 말씀해 주세요.');}
    // One outstanding handoff per elder/context; repeated failures do not flood staff.
    const existing=db.requests.find(r=>r.elderId===elderId&&r.status==='attention'&&r.voiceReview&&!r.voiceReview.resolvedAt&&(r.voiceReview.checkinId||null)===(checkinId||null));
    if(existing){db.voiceFailures[key]={attempts,lastAt:clock(),requestId:existing.id};save();return existing;}
    const now=clock(),id=randomUUID();
    const request={id,organizationId:organizationOf(db.elders.find(e=>e.id===elderId)),elderId,service:'말씀 확인',requestedAt:null,requestedTimeText:'녹음을 듣고 희망 시간을 확인해 주세요.',timeNeedsReview:true,duration:60,transcript:'음성을 3회 연속 인식하지 못했습니다. 녹음을 확인해 주세요.',createdAt:now,status:'attention',reason:'말씀 인식 3회 실패 · 녹음을 듣고 요청 내용과 일정을 입력해 주세요.',events:[{at:now,actor:'시스템',message:'음성 인식 3회 연속 실패로 세 번째 녹음을 사회복지사 확인 요청에 첨부했습니다.'}],voiceReview:{mimeType:type,createdAt:now,attempts:3,checkinId:checkinId||null}};
    mkdirSync(directory,{recursive:true});writeFileSync(file(id),audio,{flag:'wx',mode:0o600});
    const oldState=db.voiceFailures[key];
    try{db.requests.unshift(request);db.voiceFailures[key]={attempts,lastAt:now,requestId:id};onFallback(request);save();}
    catch(e){db.requests=db.requests.filter(r=>r.id!==id);if(oldState)db.voiceFailures[key]=oldState;else delete db.voiceFailures[key];try{unlinkSync(file(id));}catch{}throw e;}
    return request;
   }
   // Account changes during inference can replace the DB object, so use the current one.
   delete getDb().voiceFailures?.[key];save();return result;
  }finally{busy.delete(key);}
 }
 return {process,recording};
}
