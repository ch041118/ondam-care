import {saveCaregiver} from './caregivers.mjs';

// Geocoding is slow I/O. Never mutate the state captured before that await.
export async function updateCaregiverProfile({getDb,commit,authorize=()=>{}},body,options){
 const original=body.id?getDb().caregivers.find(c=>c.id===body.id):undefined;
 const before=JSON.stringify(original);
 const draft={caregivers:original?[structuredClone(original)]:[]};
 const prepared=await saveCaregiver(draft,body,options);
 return commit(db=>{
  authorize(db);
  if(body.id){
   const current=db.caregivers.find(c=>c.id===body.id);
   if(JSON.stringify(current)!==before)throw Object.assign(Error('근무 정보가 다른 곳에서 변경됐습니다. 새로 확인한 뒤 저장해 주세요.'),{status:409});
   Object.assign(current,prepared);return current;
  }
  db.caregivers.push(prepared);return prepared;
 });
}
