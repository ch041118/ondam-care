import test from 'node:test';import assert from 'node:assert/strict';
import {resolveCandidates,transition} from '../lib/scheduler.mjs';
import {authorize} from '../lib/auth.mjs';
import {filterCandidates,bindResolvePicker} from '../public/resolve-picker.js';
import {apiTarget} from '../expo/bridge-policy.mjs';
const now=Date.parse('2026-10-02T08:00:00+09:00'),start='2026-10-02T10:00:00+09:00';
function fixture(){const c={id:'c',name:'김보호사',address:'서울 마포구',from:9,to:18,days:[5],services:['생활 도움']};return {caregivers:[c,{...c,id:'b',name:'박보호사',address:'서울 은평구'}],accounts:['c','b'].map(id=>({role:'caregiver',caregiverId:id,approvalStatus:'approved'})),requests:[]};}
const request=()=>({id:'r',elderId:'e',service:'생활 도움',duration:60,status:'attention',events:[]});
test('조율 후보: 근무 요일·종료 시각·종류·승인·과거 시간을 검사한다',()=>{
 const db=fixture(),r=request();assert.equal(resolveCandidates(db,r,{start},now).length,2);
 db.accounts[0].approvalStatus='pending';assert.deepEqual(resolveCandidates(db,r,{start},now).map(c=>c.id),['b']);db.accounts[1].disabled=true;assert.equal(resolveCandidates(db,r,{start},now).length,0);
 assert.equal(resolveCandidates(fixture(),r,{start:'2026-10-03T10:00:00+09:00'},now).length,0);assert.equal(resolveCandidates(fixture(),r,{start:'2026-10-02T17:30:00+09:00'},now).length,0);
 assert.equal(resolveCandidates(fixture(),{...r,service:'식사 도움'},{start},now).length,0);assert.throws(()=>resolveCandidates(fixture(),r,{start:now-1},now));
});
test('조율 후보: 보호사·어르신 예약과 이동 여유, 저장 중 경쟁을 재검사한다',()=>{
 const db=fixture(),r=request(),body={start,caregiverId:'c',note:'통화 확인'};assert.equal(resolveCandidates(db,r,body,now).length,2);
 db.requests.push({id:'busy',elderId:'other',caregiverId:'c',status:'confirmed',start:Date.parse(start)-75*60000,duration:60});
 assert.deepEqual(resolveCandidates(db,r,body,now).map(c=>c.id),['b']);assert.throws(()=>transition(db,r,'resolve',body,now));assert.equal(r.status,'attention');
 db.requests[0].elderId='e';assert.equal(resolveCandidates(db,r,body,now).length,0);
 db.requests[0].id='r';assert.equal(resolveCandidates(db,r,body,now).length,2);
});
test('조율 후보: 녹음 해석 서비스 및 이름·지역 검색, 직원 전용 API',()=>{
 const db=fixture(),r={...request(),service:'말씀 확인',voiceReview:{}};assert.throws(()=>resolveCandidates(db,r,{start},now));assert.equal(resolveCandidates(db,r,{start,service:'생활 도움'},now).length,2);
 assert.deepEqual(filterCandidates(db.caregivers,' 은평 ').map(c=>c.id),['b']);assert.deepEqual(filterCandidates(db.caregivers,'김').map(c=>c.id),['c']);
 assert.throws(()=>authorize(db,{role:'elder',elderId:'e'},'resolve-candidates',{}));assert.throws(()=>authorize(db,{role:'caregiver',approvalStatus:'approved'},'resolve-candidates',{}));db.requests.push(r);assert.throws(()=>authorize(db,{role:'social',approvalStatus:'approved'},'resolve-candidates',{}));assert.doesNotThrow(()=>authorize(db,{role:'social',approvalStatus:'approved'},'resolve-candidates',{id:r.id}));assert.ok(apiTarget('https://example.test','/api/resolve-candidates','POST'));
});
test('조율 선택: 빠르게 일시를 바꿀 때 늦은 응답이 최신 후보를 덮지 않는다',async()=>{
 const field=()=>({value:'',disabled:false,hidden:false,textContent:'',innerHTML:'',events:{},addEventListener(name,fn){this.events[name]=fn;}}),startField=field(),select=field(),search=field(),message=field(),retry=field(),submit=field();
 const fields={'[data-candidate-search]':search,'[data-candidate-message]':message,'[data-candidate-retry]':retry,'[type="submit"]':submit};const form={elements:{start:startField,caregiverId:select},dataset:{id:'r'},isConnected:true,querySelector:q=>fields[q]};
 const pending=[];bindResolvePicker(form,()=>new Promise(resolve=>pending.push(resolve)));assert.equal(select.disabled,true);startField.value='2026-10-02T10:00';const first=startField.events.input();startField.value='2026-10-02T11:00';const second=startField.events.input();pending[1]({caregivers:[{id:'new',name:'최신',address:'서울'}]});await second;pending[0]({caregivers:[{id:'old',name:'이전',address:'서울'}]});await first;assert.match(select.innerHTML,/최신/);assert.doesNotMatch(select.innerHTML,/이전/);
});
