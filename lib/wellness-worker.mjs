import {organizationOf,retireEmergencyFeatures} from './organization.mjs';
import { tickWellness, completeDelivery, ensureWellness, awaitingReply } from './wellness.mjs';
export function createWellnessWorker({getDb,save,send,clock=Date.now}){
 let busy=false,dirty=false;
 const persist=async()=>{dirty=true;await save();dirty=false;};
 return async function run(){if(busy)return;busy=true;try{
  let db=retireEmergencyFeatures(ensureWellness(getDb())),changed=false;
  tickWellness(db,clock(),()=>{changed=true;});if(changed||dirty)await persist();
  const ids=db.wellnessOutbox.map(j=>j.id);
  for(const id of ids){
   db=ensureWellness(getDb());const job=db.wellnessOutbox.find(j=>j.id===id);if(!job)continue;
   if(job.status==='sending'&&job.leaseUntil<=clock())job.status='pending';
   if(job.status!=='pending')continue;
   const item=db.checkins.find(c=>c.id===job.checkinId);
   if(job.kind==='reminder'&&(!item||item.status!=='waiting'||!awaitingReply(item))){job.status='cancelled';await persist();continue;}
   if(job.expiresAt<=clock()){completeDelivery(db,id,{ok:false,error:'알림 전송 대기 시간이 지났습니다.'},clock());await persist();continue;}
   job.status='sending';job.leaseUntil=clock()+120000;await persist();
   const elder=db.elders.find(e=>e.id===job.elderId);
   const devices=db.wellnessDevices.filter(d=>{const account=db.accounts?.find(a=>a.id===d.userId&&!a.disabled);return d.permission==='granted'&&d.token&&(job.kind==='staff'?account&&(account.role==='admin'||account.role==='social'&&account.approvalStatus==='approved'&&organizationOf(account)===organizationOf(elder)):d.role==='elder'&&d.elderId===job.elderId);});
   let result;try{result=await send(job,devices);}catch{result={ok:false,error:'알림 전송을 완료하지 못했습니다.'};}
   // Authentication commits may replace the state while provider I/O is pending.
   // Finish against the latest state so replies, logouts and delivery results survive.
   completeDelivery(ensureWellness(getDb()),id,result,clock());await persist();
  }
 }finally{busy=false;}};
}
