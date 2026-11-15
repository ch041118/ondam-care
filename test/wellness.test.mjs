import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureWellness,tickWellness,completeDelivery,markElderActivity,replyCheckin,resolveCheckin,updateWellnessSettings,classifyWellnessReply,simulateCheckin,publicWellnessState,needsAttention } from '../lib/wellness.mjs';
import {createWellnessWorker} from '../lib/wellness-worker.mjs';
const start=Date.parse('2026-09-26T19:00:00+09:00'),minute=60000;
const fixture=()=>ensureWellness({elders:[{id:'e1',name:'가상 어르신'}]});
const first=db=>db.checkins[0];
function send(db,time){tickWellness(db,time);const job=db.wellnessOutbox.find(j=>j.kind==='reminder'&&j.status==='pending');if(job)completeDelivery(db,job.id,{ok:true},time);return job;}
test('안부: 19시 전에는 시작하지 않는다',()=>{const db=fixture();tickWellness(db,start-1);assert.equal(db.checkins.length,0);});
test('안부: 오늘 앱을 사용하면 알림을 생략한다',()=>{const db=fixture();markElderActivity(db,'e1',start-3600000);tickWellness(db,start);assert.equal(first(db).status,'skipped');assert.equal(db.wellnessOutbox.length,0);});
test('안부: 어제 활동은 오늘 알림을 막지 않는다',()=>{const db=fixture();markElderActivity(db,'e1',start-86400000);tickWellness(db,start);assert.equal(first(db).status,'waiting');});
test('안부: 19:00/05/10 알림 후 19:15에 담당자에게 올린다',()=>{const db=fixture();send(db,start);tickWellness(db,start+4*minute);assert.equal(first(db).attempts.length,1);send(db,start+5*minute);send(db,start+10*minute);tickWellness(db,start+15*minute-1);assert.equal(first(db).status,'waiting');tickWellness(db,start+15*minute);assert.equal(first(db).status,'escalated');assert.equal(db.wellnessOutbox.filter(j=>j.kind==='staff').length,1);});
test('안부: 반복 tick은 같은 회차나 담당자 알림을 복제하지 않는다',()=>{const db=fixture();for(let i=0;i<5;i++)tickWellness(db,start);assert.equal(db.wellnessOutbox.length,1);send(db,start);send(db,start+5*minute);send(db,start+10*minute);for(let i=0;i<5;i++)tickWellness(db,start+15*minute);assert.equal(db.wellnessOutbox.filter(j=>j.kind==='staff').length,1);});
test('안부: 알림을 열기만 해서는 응답으로 처리하지 않는다',()=>{const db=fixture();send(db,start);markElderActivity(db,'e1',start+minute);assert.equal(first(db).status,'waiting');assert.ok(!first(db).respondedAt);});
test('안부: 응답하면 대기 중인 알림이 취소되고 중복 응답은 멱등하다',()=>{const db=fixture();send(db,start);tickWellness(db,start+5*minute);const input={id:first(db).id,elderId:'e1',outcome:'okay'};replyCheckin(db,input,start+6*minute);replyCheckin(db,input,start+7*minute);tickWellness(db,start+60*minute);assert.equal(first(db).status,'responded');assert.equal(first(db).respondedAt,start+6*minute);assert.equal(db.wellnessOutbox.filter(j=>j.status==='pending').length,0);});
test('안부: 전송 실패는 무응답 회차로 세지 않고 별도 확인 대상으로 남긴다',()=>{const db=fixture();tickWellness(db,start);completeDelivery(db,db.wellnessOutbox[0].id,{ok:false,error:'알림 권한 없음'},start);assert.equal(first(db).status,'delivery_failed');assert.equal(first(db).attempts.length,0);assert.ok(needsAttention(first(db)));});
test('안부: 미응답 보고 후 늦은 답변은 담당자 확인 전까지 이력을 유지한다',()=>{const db=fixture();send(db,start);send(db,start+5*minute);send(db,start+10*minute);tickWellness(db,start+15*minute);replyCheckin(db,{id:first(db).id,elderId:'e1',outcome:'okay'},start+16*minute);assert.equal(first(db).status,'responded');assert.ok(needsAttention(first(db)));resolveCheckin(db,{id:first(db).id,note:'전화로 안부 확인'},start+17*minute);assert.ok(!needsAttention(first(db)));});
test('안부: 명확한 긍정만 자동 완료하고 부정·불명확 답변은 확인한다',()=>{assert.equal(classifyWellnessReply('네, 잘 지내요!'),'okay');for(const text of ['안 괜찮아요','넘어졌어요','도와 주세요','아니요','잘 지내지만 숨쉬기 힘들어요'])assert.equal(classifyWellnessReply(text),'review');});
test('안부: 확인이 필요한 음성 답변은 즉시 담당자에게 알린다',()=>{const db=fixture();send(db,start);replyCheckin(db,{id:first(db).id,elderId:'e1',outcome:'review',text:'도와 주세요'},start+minute);assert.equal(first(db).status,'review');assert.ok(needsAttention(first(db)));assert.equal(first(db).nextAt,null);});
test('안부: 서버 재시작 후에도 회차가 유지된다',()=>{let db=fixture();send(db,start);db=JSON.parse(JSON.stringify(db));send(db,start+5*minute);assert.equal(first(db).attempts.length,2);});
test('안부: 서버가 오래 멈췄다면 심야에 몰아서 묻지 않는다',()=>{const db=fixture();tickWellness(db,start+4*3600000);assert.equal(first(db).status,'delivery_failed');assert.equal(db.wellnessOutbox.filter(j=>j.kind==='reminder').length,0);});
test('안부: 설정 중단 시 예약 알림을 취소한다',()=>{const db=fixture();tickWellness(db,start);updateWellnessSettings(db,{enabled:false,hour:19,minute:0,maxAttempts:3},start+1);assert.equal(first(db).status,'cancelled');assert.equal(db.wellnessOutbox[0].status,'cancelled');});
test('안부: 진행 중인 건의 횟수는 설정 변경에 영향받지 않는다',()=>{const db=fixture();send(db,start);updateWellnessSettings(db,{enabled:true,hour:20,minute:0,maxAttempts:5},start+1);assert.equal(first(db).policy.maxAttempts,3);assert.equal(db.wellnessSettings.maxAttempts,5);});
test('안부: 다른 어르신의 응답을 받지 않는다',()=>{const db=fixture();send(db,start);assert.throws(()=>replyCheckin(db,{id:first(db).id,elderId:'someone-else',outcome:'okay'}));});
test('안부: 기기 토큰은 공개 상태에서 제거한다',()=>{const db=fixture();db.wellnessDevices.push({id:'d1',token:'secret-token'});assert.ok(!JSON.stringify(publicWellnessState(db)).includes('secret-token'));});
test('안부: 체험은 실제 푸시나 활동 기록을 변경하지 않는다',()=>{const db=fixture();const c=simulateCheckin(db,{elderId:'e1'},start);replyCheckin(db,{id:c.id,elderId:'e1',outcome:'okay'},start+1);assert.equal(db.wellnessOutbox.length,0);assert.equal(db.elders[0].lastActiveAt,undefined);});
test('안부: unresolved 사건이 있으면 다음 날 중복 사건을 쌓지 않는다',()=>{const db=fixture();send(db,start);send(db,start+5*minute);send(db,start+10*minute);tickWellness(db,start+15*minute);tickWellness(db,start+86400000);assert.equal(db.checkins.length,1);});
test('안부: worker는 앱과 무관하게 실행하며 중첩 실행을 막는다',async()=>{const db=fixture();let sends=0,release;const pending=new Promise(r=>release=r);const run=createWellnessWorker({getDb:()=>db,save:()=>{},clock:()=>start,send:async()=>{sends++;await pending;return {ok:true};}});const firstRun=run();await Promise.resolve();await Promise.resolve();await run();release();await firstRun;assert.equal(sends,1);assert.equal(first(db).attempts.length,1);});
test('안부: 발송 중 답변이 오면 재알림을 만들지 않는다',async()=>{const db=fixture();const run=createWellnessWorker({getDb:()=>db,save:()=>{},clock:()=>start,send:async()=>{replyCheckin(db,{id:first(db).id,elderId:'e1',outcome:'okay'},start+1);return {ok:true};}});await run();assert.equal(first(db).status,'responded');assert.equal(first(db).nextAt,null);});
test('안부: worker의 만료 알림은 발송하지 않고 실패를 기록한다',async()=>{const db=fixture();tickWellness(db,start);let reminderSends=0;const run=createWellnessWorker({getDb:()=>db,save:()=>{},clock:()=>start+6*minute,send:async job=>{if(job.kind==='reminder')reminderSends++;return {ok:false,error:'등록 기기 없음'};}});await run();assert.equal(reminderSends,0);assert.equal(first(db).status,'delivery_failed');});

test('안부: 발송 중 인증 저장으로 상태 객체가 바뀌어도 전송 결과를 보존한다',async()=>{let db=fixture();const run=createWellnessWorker({getDb:()=>db,save:async()=>{},clock:()=>start,send:async()=>{db=structuredClone(db);db.accounts=[{id:'new-account'}];return {ok:true};}});await run();assert.equal(first(db).attempts.length,1);assert.equal(db.accounts[0].id,'new-account');assert.equal(db.wellnessOutbox[0].status,'sent');});

test('안부 최적화: 바뀐 내용이 없으면 반복 확인해도 디스크에 쓰지 않는다',async()=>{
 const db=fixture();let writes=0;
 const run=createWellnessWorker({getDb:()=>db,clock:()=>start-3600000,save:()=>writes++,send:()=>{throw Error('발송하면 안 됨');}});
 for(let i=0;i<100;i++)await run();assert.equal(writes,0);
});
test('안부 최적화: 새 알림과 발송 중 상태를 먼저 저장하고 결과도 저장한다',async()=>{
 const db=fixture(),snapshots=[];
 const run=createWellnessWorker({getDb:()=>db,clock:()=>start,save:()=>snapshots.push(structuredClone(db)),send:async()=>{assert.equal(snapshots.at(-1).wellnessOutbox[0].status,'sending');return {ok:true};}});
 await run();assert.deepEqual(snapshots.map(d=>d.wellnessOutbox[0].status),['pending','sending','sent']);
 for(let i=0;i<10;i++)await run();assert.equal(snapshots.length,3);
});
test('안부 최적화: 저장에 실패한 변경은 다음 확인 때 다시 저장한다',async()=>{
 const db=fixture();markElderActivity(db,'e1',start-1000);let writes=0,saved;
 const run=createWellnessWorker({getDb:()=>db,clock:()=>start,save:()=>{if(++writes===1)throw Error('디스크 오류');saved=structuredClone(db);},send:()=>{throw Error('발송하면 안 됨');}});
 await assert.rejects(run(),/디스크 오류/);await run();assert.equal(first(saved).status,'skipped');assert.equal(writes,2);
 await run();assert.equal(writes,2);
});
test('안부 최적화: 응답 완료된 기록의 남은 알림을 취소하고 저장한다',async()=>{
 const db=fixture();tickWellness(db,start);first(db).status='responded';first(db).respondedAt=start;let saved;
 const run=createWellnessWorker({getDb:()=>db,clock:()=>start,save:()=>{saved=structuredClone(db);},send:()=>{throw Error('발송하면 안 됨');}});
 await run();assert.equal(saved.wellnessOutbox[0].status,'cancelled');
});
