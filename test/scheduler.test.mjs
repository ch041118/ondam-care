import test from 'node:test';
import assert from 'node:assert/strict';
import { match, available, transition, localTime, seoulDay } from '../lib/scheduler.mjs';
const now = Date.parse('2026-09-24T08:00:00+09:00');
const at = h => localTime('2026-09-24',h);
function fixture(){return {elders:[{id:'e',lat:37.56,lng:126.92},{id:'e2',lat:37.56,lng:126.92}],caregivers:[{id:'c',name:'보호사',lat:37.56,lng:126.92,from:9,to:18,days:[1,2,3,4,5],services:['생활 도움']},{id:'c2',name:'보호사2',lat:37.57,lng:126.92,from:9,to:18,days:[1,2,3,4,5],services:['생활 도움']}],requests:[]};}
const request = () => ({id:'r',elderId:'e',service:'생활 도움',requestedAt:at(10),duration:60,status:'pending',events:[]});
test('희망 시간과 가까운 보호사를 우선 배정한다',()=>{const r=match(fixture(),request(),now);assert.equal(r.start,at(10));assert.equal(r.caregiverId,'c');});
test('보호사 일정 충돌 시 같은 시간의 다른 보호사를 선택한다',()=>{const db=fixture();db.requests=[{...request(),id:'busy',elderId:'e2',start:at(10),caregiverId:'c'}];assert.equal(match(db,request(),now).caregiverId,'c2');});
test('어르신의 중복 일정과 이동 여유를 피한다',()=>{const db=fixture();db.requests=[{...request(),id:'busy',start:at(10),caregiverId:'c'}];assert.equal(match(db,request(),now).start,at(11)+30*60000);});
test('종료 시각을 넘는 요청은 다음 가능일로 넘어간다',()=>{const r=match(fixture(),{...request(),requestedAt:at(18)},now);assert.equal(r.start,localTime('2026-09-25',9));});
test('조건을 만족하는 보호사가 없으면 자동 확정하지 않는다',()=>{const db=fixture();db.caregivers.forEach(c=>c.days=[]);assert.equal(match(db,request(),now),null);});
test('5km 밖 보호사와 지원하지 않는 서비스는 제외한다',()=>{const db=fixture();db.caregivers[0].lat=38;db.caregivers[1].services=[];assert.equal(match(db,request(),now),null);});
test('취소된 배정은 슬롯을 점유하지 않는다',()=>{const db=fixture();db.requests=[{...request(),id:'old',status:'attention',start:at(10),caregiverId:'c'}];assert.equal(match(db,request(),now).start,at(10));});
test('불가 사유를 필수로 받고 이력과 조율 상태를 저장한다',()=>{const db=fixture(),r=request();assert.throws(()=>transition(db,r,'reject',{reason:' '}));transition(db,r,'reject',{reason:'방문 불가'});assert.equal(r.status,'attention');assert.match(r.events[0].message,/방문 불가/);});
test('조율 후 재수락을 기다리고 완료 상태에서 수락을 차단한다',()=>{const db=fixture(),r={...request(),status:'attention'};transition(db,r,'resolve',{caregiverId:'c',start:'2026-09-24T11:00:00+09:00',note:'어르신과 통화 후 조율'},now);assert.equal(r.status,'pending');transition(db,r,'accept');assert.equal(r.status,'confirmed');assert.throws(()=>transition(db,r,'complete',{},now));transition(db,r,'complete',{},at(13));assert.equal(r.status,'completed');assert.throws(()=>transition(db,r,'accept'));});
test('직접 조율도 다른 예약과 충돌할 수 없다',()=>{const db=fixture(),r={...request(),status:'attention'};db.requests=[{...request(),id:'busy',start:at(10),caregiverId:'c'}];assert.throws(()=>transition(db,r,'resolve',{caregiverId:'c',start:'2026-09-24T10:00:00+09:00',note:'확인'},now));assert.equal(r.status,'attention');});
test('한국 시간대 날짜 경계를 사용한다',()=>{assert.equal(seoulDay(Date.parse('2026-09-24T16:00:00Z')),'2026-09-25');});
test('지원하지 않는 서비스에 수동 배정할 수 없다',()=>{const db=fixture(),r={...request(),status:'attention',service:'병원 동행'};assert.throws(()=>transition(db,r,'resolve',{caregiverId:'c',start:'2026-09-24T11:00:00+09:00',note:'확인'},now));});
