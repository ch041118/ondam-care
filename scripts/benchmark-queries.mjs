import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {runReadTool} from '../lib/agent-tools.mjs';
import {ensureAuth,scopedState} from '../lib/auth.mjs';
import {ensureWellness} from '../lib/wellness.mjs';

// Synthetic in-memory queries: excludes HTTP, disk, LLM, STT and network latency.
const now=Date.parse('2026-10-28T10:00:00+09:00');
const user={id:'staff',role:'social',name:'검증',organizationId:'clover',approvalStatus:'approved'};
const db=ensureAuth(ensureWellness({
 elders:Array.from({length:2000},(_,i)=>({id:'e'+i,name:'어르신'+i,ownerCaregiverId:'c'+i%500})),
 caregivers:Array.from({length:500},(_,i)=>({id:'c'+i,name:'보호사'+i,services:['생활 도움']})),
 requests:Array.from({length:20000},(_,i)=>({id:'r'+i,elderId:'e'+i%2000,caregiverId:'c'+i%500,status:['pending','confirmed','completed','attention'][i%4],service:'생활 도움',createdAt:now-i*60000,start:now+i*60000,duration:60})),
 accounts:[user,...Array.from({length:500},(_,i)=>({id:'account'+i,role:'caregiver',caregiverId:'c'+i,approvalStatus:'approved'}))],
 wellnessDevices:Array.from({length:1000},(_,i)=>({id:'device'+i,userId:'account'+i%500,token:'synthetic',sessionHash:'synthetic'})),
 checkins:Array.from({length:10000},(_,i)=>({id:'ch'+i,elderId:'e'+i%2000,createdAt:now,status:'responded'})),
 wellnessOutbox:Array.from({length:10000},(_,i)=>({id:'n'+i,checkinId:'ch'+i,kind:'staff',status:'sent',createdAt:now}))
}));
const cases=[['scoped_social',()=>scopedState(db,user)],['scoped_caregiver',()=>scopedState(db,{...user,role:'caregiver',caregiverId:'c1'})],
 ...[['list_requests',{}],['list_requests',{query:'어르신1'}],['list_elders',{filter:'active'}],['get_statistics',{}],['list_notifications',{}]].map(([name,args])=>[name+(args.query?'_search':''),()=>runReadTool({db,user,now},name,args)])];
const results=[];
for(const [name,run]of cases){for(let i=0;i<2;i++)await run();const samples=[];for(let i=0;i<9;i++){const start=performance.now();await run();samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);results.push({name,medianMs:+samples[4].toFixed(3),p95Ms:+samples[8].toFixed(3)});}
const report={measuredAt:new Date().toISOString(),node:process.version,fixture:{requests:20000,elders:2000,caregivers:500,checkins:10000,notifications:10000},scope:'Synthetic in-memory queries; not simultaneous-user capacity or LLM/STT latency.',results};
if(process.argv[2]){await mkdir(dirname(process.argv[2]),{recursive:true});await writeFile(process.argv[2],JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
