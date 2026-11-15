import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureAuth,scopedState,canUseElder} from '../lib/auth.mjs';
import {canEditElderNotes} from '../lib/elder-notes.mjs';
import {ensureWellness} from '../lib/wellness.mjs';
import {runReadTool,toolCatalog,validateToolArguments} from '../lib/agent-tools.mjs';
import {createAgentService,planWithModel} from '../lib/agent.mjs';
import {toolMessage,boundedMessages} from '../lib/agent-context.mjs';
const now=Date.parse('2026-10-28T09:00:00+09:00'),user={id:'s',role:'social',approvalStatus:'approved',organizationId:'a'};
function fixture(){return ensureAuth(ensureWellness({
 elders:Array.from({length:25},(_,i)=>({id:'e'+i,name:'어르신'+i,organizationId:i%2?'a':'b',ownerCaregiverId:'c'+i%3,specialNotes:'주의'})),
 caregivers:Array.from({length:3},(_,i)=>({id:'c'+i,name:'보호사'+i,organizationId:'a'})),
 requests:Array.from({length:500},(_,i)=>({id:'r'+i,elderId:'e'+i%25,organizationId:i%25%2?'a':'b',caregiverId:'c'+i%3,service:i%2?'식사 도움':'생활 도움',status:['pending','confirmed','completed','attention'][i%4],createdAt:now-i*60000,start:now+i*60000,duration:60})),accounts:[user]
}));}
test('최적화된 범위 조회는 역할별 기존 조회·메모 권한을 유지한다',()=>{
 const db=fixture();for(const actor of [user,{...user,role:'admin'},{...user,role:'caregiver',caregiverId:'c1'},{...user,role:'elder',elderId:'e1'}]){
  const state=scopedState(db,actor),expected=db.elders.filter(e=>canUseElder(db,actor,e.id));assert.deepEqual(state.elders.map(e=>e.id),expected.map(e=>e.id));
  for(const e of state.elders)if(actor.role!=='elder')assert.equal(e.notesEditable,canEditElderNotes(db,actor,e.id));else assert.equal(e.specialNotes,undefined);
 }
});
test('검색·페이지·통계는 전체 원본과 일치하며 다음 호출에 최신 상태를 반영한다',async()=>{
 const db=fixture(),rows=scopedState(db,user).requests,context={db,user,now};
 const result=await runReadTool(context,'list_requests',{query:'어르신1',offset:3,limit:7});
 const expected=rows.filter(r=>db.elders.find(e=>e.id===r.elderId).name.includes('어르신1')).sort((a,b)=>b.createdAt-a.createdAt);assert.equal(result.total,expected.length);assert.deepEqual(result.items.map(r=>r.id),expected.slice(3,10).map(r=>r.id));
 const stats=await runReadTool(context,'get_statistics',{});assert.equal(stats.total,rows.length);for(const [status,count]of Object.entries(stats.byStatus))assert.equal(count,rows.filter(r=>r.status===status).length);for(const [id,count]of Object.entries(stats.byCaregiver))assert.equal(count,rows.filter(r=>r.caregiverId===id).length);
 const previous=stats.unprocessed;db.requests.find(r=>r.organizationId==='a'&&r.status==='pending').status='completed';assert.equal((await runReadTool(context,'get_statistics')).unprocessed,previous-1);
 db.elders.find(e=>e.id==='e1').name='새 이름';assert.equal((await runReadTool(context,'list_requests',{elderId:'e1',limit:1})).items[0].elderName,'새 이름');
});
test('시작일만 지정한 시간표는 해당 날짜부터 일주일을 조회한다',async()=>{
 const db=fixture();db.requests.push({id:'future',elderId:'e1',caregiverId:'c1',organizationId:'a',status:'confirmed',start:Date.parse('2027-01-03T10:00:00+09:00')});
 const r=await runReadTool({db,user,now},'get_schedule',{from:'2027-01-01'});assert.equal(r.to,'2027-01-07');assert.equal(r.total,1);assert.equal(r.items[0].id,'future');
});
test('알림 페이지는 기관·어르신 필터를 유지하며 비밀값을 제외한다',async()=>{
 const db=fixture();db.checkins=[{id:'ch1',elderId:'e1'},{id:'ch2',elderId:'e2'}];db.wellnessOutbox=[{id:'n1',checkinId:'ch1',kind:'staff',status:'sent',token:'SECRET'},{id:'n2',checkinId:'ch2',kind:'staff',status:'sent'},{id:'n3',elderId:'e1',kind:'sos',status:'sent'}];
 const r=await runReadTool({db,user,now},'list_notifications',{elderId:'e1'});assert.deepEqual(r.items.map(j=>j.id),['n1']);assert.doesNotMatch(JSON.stringify(r),/SECRET/);
});
test('모델 입력 크기를 제한해도 유효한 JSON·전체 건수·다음 페이지 위치를 유지한다',()=>{
 const original={total:50000,offset:20,hasMore:true,items:Array.from({length:100},(_,i)=>({id:'r'+i,transcript:'말씀'.repeat(4000)}))};
 const text=toolMessage('list_requests',original),copy=JSON.parse(text);assert.ok(text.length<=8000);assert.equal(copy.result.total,50000);assert.equal(copy.truncated,true);assert.equal(copy.result.nextOffset,20+copy.result.items.length);assert.equal(original.items.length,100);assert.equal(original.items[0].transcript.length,8000);
 const messages=[{role:'system',content:'지침'},...Array.from({length:20},(_,i)=>({role:'user',content:String(i).padEnd(2000,'가')}))];const bounded=boundedMessages(messages);assert.equal(bounded[0],messages[0]);assert.equal(bounded.at(-1),messages.at(-1));assert.ok(bounded.slice(1).reduce((n,m)=>n+m.content.length,0)<=16000);
 const anchored=boundedMessages(messages,16000,messages[1]);assert.ok(anchored.includes(messages[1]));assert.equal(anchored.at(-1),messages.at(-1));assert.ok(anchored.slice(1).reduce((n,m)=>n+m.content.length,0)<=16000);
});
test('조회 도중 소속이 바뀌면 이전 대화의 결과를 반환하지 않는다',async()=>{
 const db=fixture();let fresh={...user};const service=createAgentService({getDb:()=>db,commit:fn=>fn(db),getUser:()=>fresh,planner:async()=>{fresh={...user,organizationId:'b'};return {answer:'이전 기관 정보',calls:[]};}});
 await assert.rejects(service.chat(user,{message:'내 기관 요청 조회'}),e=>e.status===403);
});
test('잘못된 모델 도구 응답은 실행 전에 형식 오류로 처리한다',async()=>{
 for(const plan of [null,{answer:'',calls:[null]},{answer:'',calls:[{name:'list_requests',arguments:[]}]}])await assert.rejects(planWithModel([],toolCatalog(user),{env:{OLLAMA_MODEL:'test'},fetchImpl:async()=>({ok:true,json:async()=>({message:{content:JSON.stringify(plan)}})})}),e=>e.status===502);
});

test('도구 스키마의 상속된 프로퍼티를 지원 인자로 오인하지 않는다',()=>{
 const def=toolCatalog(user).find(t=>t.name==='list_requests');
 for(const key of ['constructor','toString','__proto__'])assert.throws(()=>validateToolArguments(def,JSON.parse('{"'+key+'":"unexpected"}')),/지원하지 않는 인자/);
});
