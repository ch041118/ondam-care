import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRequests,initialRoute} from '../public/request-view.js';
const now=Date.parse('2026-10-01T12:00:00+09:00');
const rows=['pending','confirmed','attention','completed'].map((status,i)=>({id:String(i),status,elderId:'e',caregiverId:'c',completedAt:now})).concat({id:'old',status:'completed',elderId:'e',caregiverId:'c',completedAt:1});
test('요약 연결: 접수는 완료 전만, 각 상태와 최근 완료의 건수가 일치한다',()=>{
 assert.deepEqual(selectRequests(rows,{status:'received',now}).map(r=>r.id),['0','1','2']);
 for(const [i,status] of ['pending','confirmed','attention','completed'].entries())assert.deepEqual(selectRequests(rows,{status,now}).map(r=>r.id),[String(i)]);
 assert.equal(selectRequests(rows,{history:true,now}).length,2);assert.equal(rows.length,5);
});
test('요약 연결: 이름 검색·보호사 범위에도 선택한 상태를 유지한다',()=>{
 const options={status:'received',caregiverId:'c',term:'김',elders:[{id:'e',name:'김어르신'}],now};
 assert.equal(selectRequests(rows,options).length,3);assert.equal(selectRequests(rows,{...options,caregiverId:'other'}).length,0);assert.equal(selectRequests(rows,{...options,term:'박'}).length,0);
});
test('로그인 복원: 직원은 비서·시간표, 어르신은 마이크 화면',()=>{
 assert.equal(initialRoute({role:'caregiver'}),'timetable');for(const role of ['social','admin'])assert.equal(initialRoute({role}),'assistant');
 assert.equal(initialRoute({role:'elder',elderId:'e1'}),'elder/e1');
});
