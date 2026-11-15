import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewRequests,completionTime} from '../public/overview-data.js';
import {transition} from '../lib/scheduler.mjs';
const at=s=>Date.parse(s+'+09:00');
test('한눈에: 한국 날짜 오늘 포함 3일 완료만, 진행 중 요청은 유지',()=>{
 const now=at('2026-10-01T00:01:00'),requests=[
 {id:'old',status:'completed',completedAt:at('2026-09-28T23:59:59')},
 {id:'boundary',status:'completed',completedAt:at('2026-09-29T00:00:00')},
 {id:'recent',status:'completed',createdAt:1,completedAt:now},
 ...['pending','confirmed','attention'].map(status=>({id:status,status,createdAt:1}))];
 assert.deepEqual(overviewRequests(requests,now).map(r=>r.id),['boundary','recent','pending','confirmed','attention']);assert.equal(requests.length,6);
});
test('한눈에: 기존 완료 이력과 일정 종료 시각 호환',()=>{
 assert.equal(completionTime({createdAt:1,events:[{at:100,message:'돌봄을 완료했습니다.'},{at:200,message:'다른 수정'}]}),100);
 assert.equal(completionTime({start:100,duration:60,createdAt:1}),3600100);
});
test('완료 처리 시 실제 완료 시간을 저장한다',()=>{
 const now=at('2026-10-01T12:00:00'),r={status:'confirmed',start:now-7200000,duration:60,events:[]};transition({requests:[]},r,'complete',{},now);assert.equal(r.completedAt,now);
});
