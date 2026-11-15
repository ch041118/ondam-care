import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureAuth,scopedState,authorize} from '../lib/auth.mjs';
import {ensureWellness,markElderActivity,markElderRequest,tickWellness} from '../lib/wellness.mjs';
import {createRequestDraft,requestFeedback} from '../lib/request-feedback.mjs';
import {transition} from '../lib/scheduler.mjs';
import {READ_TOOLS,runReadTool,toolCatalog} from '../lib/agent-tools.mjs';
import {prepareAgentAction,confirmAgentAction} from '../lib/agent-actions.mjs';
import {createAgentService} from '../lib/agent.mjs';
import {weekDays,scheduleRows,timetableMarkup} from '../public/timetable.js';
import {feedbackButtons,draftMarkup} from '../public/feedback-ui.js';
import {apiTarget} from '../expo/bridge-policy.mjs';
const now=Date.parse('2026-10-27T08:00:00+09:00'),start=Date.parse('2026-10-27T10:00:00+09:00');
const social={id:'s',name:'복지사',role:'social',approvalStatus:'approved',organizationId:'a',sessionHash:'session-a'};
const elder={id:'e-account',role:'elder',elderId:'e',organizationId:'a'};
test('모델의 동일 조회 반복은 중단하고 실제 집계로 응답한다',async()=>{
 const db=fixture();let calls=0;
 const agent=createAgentService({getDb:()=>db,commit:fn=>fn(db),clock:()=>now,planner:async()=>{calls++;return {answer:'',calls:[{name:'get_statistics',arguments:{}}]};}});
 const result=await agent.chat(social,{message:'전체 몇 건?'});
 assert.equal(calls,2);assert.equal(result.traces.length,1);assert.match(result.answer,/접수 1건/);
});
function fixture(){return ensureAuth(ensureWellness({organizations:[{id:'a',name:'가 기관'},{id:'b',name:'나 기관'}],elders:[{id:'e',name:'김어르신',organizationId:'a',ownerCaregiverId:'c',address:'서울',lat:37,lng:127},{id:'other',name:'비공개',organizationId:'b',lat:37,lng:127}],caregivers:[{id:'c',name:'김보호사',organizationId:'a',days:[0,1,2,3,4,5,6],from:8,to:20,services:['생활 도움'],lat:37,lng:127},{id:'cb',name:'다른 보호사',organizationId:'b',days:[0,1,2,3,4,5,6],from:8,to:20,services:['생활 도움'],lat:37,lng:127}],accounts:[{...social},{id:'ca',role:'caregiver',caregiverId:'c',organizationId:'a',approvalStatus:'approved'},{id:'cba',role:'caregiver',caregiverId:'cb',organizationId:'b',approvalStatus:'approved'}],requests:[{id:'r',organizationId:'a',elderId:'e',caregiverId:'c',service:'생활 도움',start,duration:60,status:'confirmed',createdAt:now,revision:0,events:[]},{id:'rb',organizationId:'b',elderId:'other',caregiverId:'cb',service:'생활 도움',start,duration:60,status:'confirmed',createdAt:now,events:[]},{id:'old-sos',organizationId:'a',elderId:'e',urgency:'sos',status:'attention',events:[]}]}));}
test('기관 격리: 화면과 모든 조회 도구에서 다른 기관과 종료된 요청 미노출',async()=>{
 const db=fixture(),state=scopedState(db,social);assert.deepEqual(state.requests.map(r=>r.id),['r']);assert.deepEqual(state.elders.map(e=>e.id),['e']);
 for(const name of ['list_requests','list_elders','list_caregivers','get_schedule','get_statistics','get_report','list_organizations']){const r=await runReadTool({db,user:social,now},name,{});assert.doesNotMatch(JSON.stringify(r),/비공개|다른 보호사|old-sos|"rb"/);}
 for(const name of ['get_request','get_elder','get_caregiver'])await assert.rejects(runReadTool({db,user:social},name,{id:name==='get_request'?'rb':name==='get_elder'?'other':'cb'}),e=>e.status===404);
 for(const [path,body]of [['action',{id:'rb',action:'resolve'}],['caregivers',{id:'cb'}],['elder-notes',{id:'other'}]])assert.throws(()=>authorize(db,social,path,body));
 await assert.rejects(runReadTool({db,user:social},'list_approvals',{}),e=>e.status===403);assert.throws(()=>toolCatalog(elder));
});
test('조회 목록: 전체 등록 도구 실행·비밀값 제외',async()=>{
 const db=fixture();db.requests[0].status='attention';const admin={...social,role:'admin'};
 db.checkins.push({id:'ch',elderId:'e',status:'responded',createdAt:now});db.wellnessOutbox.push({id:'n',elderId:'e',checkinId:'ch',kind:'staff',status:'sent',createdAt:now,token:'SECRET'});db.wellnessDevices.push({id:'device',userId:'s',role:'social',token:'SECRET',sessionHash:'SECRET'});db.accounts[0].passwordHash='SECRET';
 const samples={get_request:{id:'r'},get_elder:{id:'e'},get_caregiver:{id:'c'},find_available_caregivers:{id:'r',start:'2026-10-27T12:00:00+09:00'},get_recording:{id:'r'},search_address:{address:'서울'}};
 for(const t of READ_TOOLS){const r=await runReadTool({db,user:admin,now,connections:{voice:false},geocode:async()=>({lat:37,lng:127})},t.name,samples[t.name]||{});assert.notEqual(r,undefined,t.name);assert.doesNotMatch(JSON.stringify(r),/SECRET/,t.name);}
});
test('조회 필터·페이지·보고서: 원본 전체 집계 및 인자 검증',async()=>{
 const db=fixture();for(let i=0;i<120;i++)db.requests.push({...db.requests[0],id:'extra-'+i,status:'attention'});
 const r=await runReadTool({db,user:social,now},'list_requests',{status:'attention',limit:10,offset:110});assert.equal(r.total,120);assert.equal(r.items.length,10);assert.equal(r.hasMore,false);
 const stats=await runReadTool({db,user:social,now},'get_statistics',{from:'2026-10-27',to:'2026-10-27'});assert.equal(stats.total,121);assert.equal(stats.unprocessed,120);
 for(const args of [{organizationId:'b'},{limit:100000},{from:'tomorrow'},{from:'2026-02-30'}])await assert.rejects(runReadTool({db,user:social},'list_requests',args));
});
test('요청 확인: 초안→본인 확인→배정→보호사 수락→어르신 확인→변경 요청',()=>{
 const db=fixture();db.requests=[];const r=createRequestDraft(db,{elderId:'e',service:'생활 도움',requestedAt:start,transcript:'생활 도움 부탁'},now);assert.equal(r.status,'draft');assert.equal(r.caregiverId,undefined);
 assert.throws(()=>requestFeedback(db,{...elder,elderId:'other'},{id:r.id,action:'confirm',revision:0},now));requestFeedback(db,elder,{id:r.id,action:'confirm',revision:0},now);assert.equal(r.status,'pending');assert.equal(r.caregiverId,'c');
 assert.throws(()=>requestFeedback(db,elder,{id:r.id,action:'confirm',revision:0},now),e=>e.status===409);transition(db,r,'accept',{},now);assert.equal(r.status,'confirmed');assert.equal(r.elderAcknowledgedAt,undefined);
 requestFeedback(db,elder,{id:r.id,action:'acknowledge',revision:r.revision},now);assert.equal(r.elderAcknowledgedAt,now);const before=r.start;
 requestFeedback(db,elder,{id:r.id,action:'request-change',revision:r.revision,note:'오후로 바꾸고 싶어요'},now);assert.equal(r.status,'confirmed');assert.equal(r.start,before);assert.equal(r.changeRequest.status,'pending');
});
test('초안 수정·교체·취소: 검토 조건 유지',()=>{
 const db=fixture();db.requests=[];const r=createRequestDraft(db,{elderId:'e',service:'생활 도움',needsReview:true,requestReviewReason:'예약 시간 확인',requestedAt:start},now);requestFeedback(db,elder,{id:r.id,action:'correct',revision:0,service:'생활 도움',requestedAt:null},now);assert.equal(r.needsReview,true);requestFeedback(db,elder,{id:r.id,action:'confirm',revision:r.revision},now);assert.equal(r.status,'attention');
 const a=createRequestDraft(db,{elderId:'e',service:'생활 도움'},now),b=createRequestDraft(db,{elderId:'e',service:'생활 도움'},now);assert.equal(a.status,'cancelled');requestFeedback(db,elder,{id:b.id,action:'cancel',revision:0},now);assert.equal(b.status,'cancelled');
});
test('일정 변경안: 확인 전 무변경·다른 사용자 차단·중복 실행 방지·충돌 재검사',()=>{
 const db=fixture(),args={id:'r',caregiverId:'c',start:'2026-10-27T13:00:00+09:00',note:'어르신 시간 변경'},p=prepareAgentAction(db,social,'propose_schedule_change',args,now);assert.equal(db.requests[0].start,start);assert.throws(()=>confirmAgentAction(db,{...social,id:'other'},{proposalId:p.proposalId,decision:'confirm'},now));
 confirmAgentAction(db,social,{proposalId:p.proposalId,decision:'confirm'},now);assert.equal(db.requests[0].status,'pending');assert.equal(db.requests[0].start,Date.parse(args.start));assert.equal(db.agentAudit.length,1);assert.equal(confirmAgentAction(db,social,{proposalId:p.proposalId,decision:'confirm'},now).alreadyApplied,true);assert.equal(db.agentAudit.length,1);
 const q=prepareAgentAction(db,social,'propose_schedule_change',{...args,start:'2026-10-27T15:00:00+09:00'},now);db.requests.push({...db.requests[0],id:'busy',start:Date.parse('2026-10-27T15:00:00+09:00')});assert.throws(()=>confirmAgentAction(db,social,{proposalId:q.proposalId,decision:'confirm'},now));
});
test('근무 변경안: 충돌·만료·취소·기관 권한·기존 일정 보존',()=>{
 const db=fixture(),args={id:'c',days:[1,2,3],from:9,to:18},before=structuredClone(db.requests);const p=prepareAgentAction(db,social,'propose_work_hours',args,now);db.caregivers[0].from=10;assert.throws(()=>confirmAgentAction(db,social,{proposalId:p.proposalId,decision:'confirm'},now),e=>e.status===409);
 const q=prepareAgentAction(db,social,'propose_work_hours',args,now);assert.throws(()=>confirmAgentAction(db,social,{proposalId:q.proposalId,decision:'confirm'},now+600001));const cancelled=prepareAgentAction(db,social,'propose_work_hours',args,now);confirmAgentAction(db,social,{proposalId:cancelled.proposalId,decision:'cancel'},now);assert.throws(()=>confirmAgentAction(db,social,{proposalId:cancelled.proposalId,decision:'confirm'},now));
 const r=prepareAgentAction(db,social,'propose_work_hours',args,now);confirmAgentAction(db,social,{proposalId:r.proposalId,decision:'confirm'},now);assert.equal(db.caregivers[0].from,9);assert.deepEqual(db.requests,before);assert.throws(()=>prepareAgentAction(db,social,'propose_work_hours',{...args,id:'cb'},now));
});
test('출석: 사용자·날짜 중복 방지, 돌봄 요청은 보존',()=>{
 const db=fixture();db.requests=[];for(let i=0;i<5;i++)markElderActivity(db,'e',now+i);assert.equal(db.attendance.length,1);createRequestDraft(db,{elderId:'e',service:'생활 도움'},now);tickWellness(db,now+12*3600000);assert.equal(db.requests[0].status,'draft');db.requests.unshift({id:'independent',elderId:'e',service:'식사 도움',status:'attention',createdAt:now});markElderRequest(db,'e',now+100);assert.equal(db.requests.length,2);assert.equal(db.attendance.length,1);markElderActivity(db,'e',now+86400000);assert.equal(db.attendance.length,2);
});
test('시간표: 한국 주간 경계·본인 일정·미확정 표시·이스케이프',()=>{
 const db=fixture();assert.equal(weekDays(now)[0].day,'2026-10-26');assert.equal(weekDays(now,-1)[0].day,'2026-10-19');assert.deepEqual(scheduleRows(db,{caregiverId:'c',now}).map(r=>r.id),['r']);db.elders[0].name='<script>alert(1)</script>';const html=timetableMarkup(db,{elderId:'e',now,elderMode:true,feedback:feedbackButtons});assert.doesNotMatch(html,/<script>/);assert.match(html,/맞아요 · 일정 확인/);db.requests[0].status='pending';assert.match(timetableMarkup(db,{caregiverId:'c',now}),/수락 대기 · 미확정/);assert.doesNotMatch(feedbackButtons(db.requests[0]),/acknowledge/);createRequestDraft(db,{elderId:'e',service:'생활 도움',transcript:'<img>'},now);assert.match(draftMarkup(db,'e',String),/&lt;img&gt;/);
});
test('모델 도구 실행: 다단계 조회·후속 대화·대화 소유권',async()=>{
 const db=fixture();let calls=0;const planner=async messages=>{calls++;if(calls===1)return {answer:'',calls:[{name:'list_elders',arguments:{query:'김어르신'}}]};if(calls===2){assert.match(JSON.stringify(messages),/김어르신/);return {answer:'',calls:[{name:'get_schedule',arguments:{elderId:'e'}}]};}return {answer:'확정된 일정 1건입니다.',calls:[]};};const service=createAgentService({getDb:()=>db,commit:fn=>fn(db),planner,clock:()=>now});const r=await service.chat(social,{message:'김어르신 일정 알려줘'});assert.equal(r.traces.length,2);assert.equal(r.mode,'model');await service.chat(social,{message:'그분 기록도',conversationId:r.conversationId});assert.equal(calls,4);await assert.rejects(service.chat({...social,id:'another'},{message:'기록',conversationId:r.conversationId}),e=>e.status===404);
});
test('기본 조회 모드: 실제 데이터와 후속 필터 유지',async()=>{
 const db=fixture(),service=createAgentService({getDb:()=>db,commit:fn=>fn(db),env:{},clock:()=>now}),first=await service.chat(social,{message:'오늘 요청 보여줘'}),next=await service.chat(social,{message:'그중 확정만',conversationId:first.conversationId});assert.equal(next.mode,'basic');assert.equal(next.traces[0].arguments.from,'2026-10-27');assert.equal(next.traces[0].arguments.status,'confirmed');assert.equal(next.traces[0].result.total,1);
});
test('앱 브리지: 새 API 허용·종료 API 차단',()=>{for(const path of ['agent/tools','agent/chat','agent/tool','agent/confirm','request-feedback','organizations'])assert.ok(apiTarget('https://care.test','/api/'+path,path==='agent/tools'?'GET':'POST'));assert.throws(()=>apiTarget('https://care.test','/api/sos','POST'));});



test('사회복지사 기록 변경: 부분 수정·확인·이력·충돌·권한',()=>{
 const db=fixture();db.elders[0].precautions='기존 주의';
 const args={id:'e',specialNotes:'보행 시 지팡이 사용'};
 const p=prepareAgentAction(db,social,'propose_elder_notes',args,now);
 assert.equal(db.elders[0].specialNotes,undefined);
 confirmAgentAction(db,social,{proposalId:p.proposalId,decision:'confirm'},now);
 assert.equal(db.elders[0].precautions,'기존 주의');assert.equal(db.elders[0].specialNotes,args.specialNotes);
 assert.equal(db.elders[0].notesHistory.length,1);
 confirmAgentAction(db,social,{proposalId:p.proposalId,decision:'confirm'},now);
 assert.equal(db.elders[0].notesHistory.length,1);
 const q=prepareAgentAction(db,social,'propose_elder_notes',args,now);db.elders[0].specialNotes='다른 담당자가 수정';
 assert.throws(()=>confirmAgentAction(db,social,{proposalId:q.proposalId,decision:'confirm'},now),e=>e.status===409);
 assert.throws(()=>prepareAgentAction(db,social,'propose_elder_notes',{...args,id:'other'},now),e=>e.status===404);
 assert.throws(()=>prepareAgentAction(db,db.accounts.find(a=>a.role==='caregiver'),'propose_elder_notes',args,now),e=>e.status===403);
 assert.throws(()=>prepareAgentAction(db,social,'propose_elder_notes',{id:'e'},now));
});
test('사회복지사 안부 처리: 실제 결과 확인 후 완료·알림 중단·기관 격리',()=>{
 const db=fixture();db.checkins.push({id:'ch',elderId:'e',status:'escalated',attentionAt:now,createdAt:now,events:[]},{id:'foreign',elderId:'other',status:'escalated',attentionAt:now,events:[]});
 db.wellnessOutbox.push({id:'job',checkinId:'ch',kind:'reminder',status:'pending'});
 const args={id:'ch',note:'전화로 식사와 건강 상태 확인, 이상 없음'};
 const p=prepareAgentAction(db,social,'propose_checkin_resolution',args,now);
 assert.equal(db.checkins[0].status,'escalated');
 confirmAgentAction(db,social,{proposalId:p.proposalId,decision:'confirm'},now);
 assert.equal(db.checkins[0].resolution,args.note);assert.equal(db.checkins[0].status,'resolved');assert.equal(db.wellnessOutbox[0].status,'cancelled');
 assert.equal(db.agentAudit.at(-1).organizationId,'a');
 assert.throws(()=>prepareAgentAction(db,social,'propose_checkin_resolution',args,now));
 assert.throws(()=>prepareAgentAction(db,social,'propose_checkin_resolution',{...args,id:'foreign'},now),e=>e.status===404);
 assert.throws(()=>prepareAgentAction(db,db.accounts.find(a=>a.role==='caregiver'),'propose_checkin_resolution',args,now),e=>e.status===403);
});
