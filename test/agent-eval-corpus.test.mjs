import test from 'node:test';
import assert from 'node:assert/strict';
import {createCases,reference,fixture,actors} from '../scripts/agent-eval-corpus.mjs';
import {ensureAuth} from '../lib/auth.mjs';
import {ensureWellness} from '../lib/wellness.mjs';
import {prepareAgentAction,confirmAgentAction} from '../lib/agent-actions.mjs';
import {NOW} from '../scripts/agent-eval-corpus.mjs';
test('비서 평가표는 1,000개 고유 ID와 기대값 및 네 분류를 가진다',()=>{
 const cases=createCases();assert.equal(cases.length,1000);assert.equal(new Set(cases.map(c=>c.id)).size,1000);
 for(const c of cases){assert.ok(c.question);assert.ok(c.expected);assert.ok(c.tool||c.intent==='deny');}
 assert.deepEqual(Object.fromEntries(['조회','후속 질문','권한·우회','변경 확인'].map(k=>[k,cases.filter(c=>c.category===k).length])),{'조회':700,'후속 질문':100,'권한·우회':100,'변경 확인':100});
 const staffSchedules=cases.filter(c=>c.intent==='schedule'&&actors[c.actor].role!=='caregiver');assert.equal(staffSchedules.length,105);for(const c of staffSchedules){assert.match(c.question,/기관의 돌봄 일정/);assert.doesNotMatch(c.question,/내 일정/);}
});
test('변경 평가 100개는 백엔드의 유효한 사전조건·기대 인자로 확인 또는 취소할 수 있다',()=>{
 for(const c of createCases().filter(c=>c.category==='변경 확인')){
  const initial=fixture();if(c.fixturePatch?.checkin)Object.assign(initial.checkins.find(r=>r.id===c.fixturePatch.checkin.id),c.fixturePatch.checkin);
  const db=ensureAuth(ensureWellness(initial)),user={...actors[c.actor],sessionHash:c.id};
  const before=JSON.stringify({elders:db.elders,caregivers:db.caregivers,checkins:db.checkins});
  const p=prepareAgentAction(db,user,c.tool,c.args,NOW);assert.equal(p.requiresConfirmation,true,c.id);assert.equal(JSON.stringify({elders:db.elders,caregivers:db.caregivers,checkins:db.checkins}),before,c.id);
  const r=confirmAgentAction(db,user,{proposalId:p.proposalId,decision:c.decision},NOW);assert.equal(c.decision==='confirm'?r.executed:r.cancelled,true,c.id);
 }
});
test('평가 기대값은 고정 원본의 기관·담당자·한국 달력 경계를 독립 집계한다',()=>{
 assert.equal(fixture().requests.length,60);
 for(const [actor,total,unprocessed,completed]of [['admin',60,24,12],['socialA',30,12,6],['carerA',10,4,2]]){
  const r=reference({actor,intent:'statistics'});assert.equal(r.total,total);assert.equal(r.unprocessed,unprocessed);assert.equal(r.completed,completed);
 }
 assert.equal(reference({actor:'socialA',intent:'schedule',period:'이번 주'}).total,16);
 assert.equal(reference({actor:'carerA',intent:'schedule',period:'이번 주'}).total,4);
 assert.equal(reference({actor:'carerA',intent:'schedule',period:'내일'}).total,0);
 assert.equal(reference({actor:'socialA',intent:'report',period:'이번 주'}).total,15);
});
