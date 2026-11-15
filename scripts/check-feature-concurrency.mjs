import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin='http://localhost:34880';let token;
async function call(path,body){const r=await fetch(origin+'/api/'+path,{method:body?'POST':'GET',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{}),'X-Clover-Client':'native'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
try{
 const login=await call('auth/login',{email:'carer-full@example.test',password:'Full-web-test-2026!'});assert.equal(login.status,200);token=login.data.token;
 const times=[];let n=0;await Promise.all(Array.from({length:10},async()=>{while(n++<100){const start=performance.now(),r=await call('state');assert.equal(r.status,200);assert.equal(r.data.requests.length,10);times.push(performance.now()-start);}}));
 const proposal=await call('agent/tool',{name:'propose_work_hours',arguments:{id:'ca1',days:[1,2,3,4,5],from:9,to:18}});assert.equal(proposal.status,200,JSON.stringify(proposal.data));
 const confirmations=await Promise.all(Array.from({length:10},()=>call('agent/confirm',{proposalId:proposal.data.result.proposalId,decision:'confirm'})));
 assert.ok(confirmations.every(r=>r.status===200));assert.equal(confirmations.filter(r=>!r.data.alreadyApplied).length,1);
 times.sort((a,b)=>a-b);const summary={readRequests:times.length,concurrency:10,allReadsPassed:true,medianMs:Math.round(times[50]),p95Ms:Math.round(times[94]),parallelConfirms:10,actualApplications:1,limitations:'100 in-memory local state reads at concurrency 10; not a production capacity benchmark, not STT/LLM load.'};writeFileSync('outputs/full-check-2026-11-02/load-and-duplicate.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
}finally{if(token)await call('auth/logout',{});}
