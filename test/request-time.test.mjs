import test from 'node:test';import assert from 'node:assert/strict';
import {parseRequestTime,applyRequestTime} from '../lib/request-time.mjs';
const now=Date.parse('2026-09-30T01:09:48+09:00');
test('시간 회귀: 내일 2시쯤을 현재 시각 +2시간으로 바꾸지 않는다',()=>{
 for(const text of ['내일 두시쯤에 밥먹자','한 내일 2시쯤에 밥 좀 먹자']){
  const r=applyRequestTime({requestedAt:'2026-09-30T03:09:48+09:00',needsReview:false},text,now);
  assert.equal(r.requestedAt,null);assert.equal(r.timeNeedsReview,true);assert.equal(r.needsReview,true);assert.match(r.requestedTimeText,/2026-10-01 2시쯤/);
 }
});
test('시간: 명확한 날짜·시각은 AI가 다른 시간을 반환해도 원문으로 계산한다',()=>{
 const r=applyRequestTime({requestedAt:'2026-09-30T03:09:48+09:00',needsReview:false},'내일 오후 두시쯤에 밥먹자',now);
 assert.equal(r.requestedAt,Date.parse('2026-10-01T14:00:00+09:00'));assert.equal(r.timeNeedsReview,false);
});
test('시간: 한국 날짜 경계·월말·분·반·숫자 표기를 처리한다',()=>{
 for(const [text,iso] of [['내일 오전 열한 시 반','2026-10-01T11:30:00+09:00'],['모레 오후 2시 15분','2026-10-02T14:15:00+09:00'],['10월 3일 오후 두시 삼십분','2026-10-03T14:30:00+09:00'],['내일 14:00쯤','2026-10-01T14:00:00+09:00']])assert.equal(parseRequestTime(text,now).requestedAt,Date.parse(iso),text);
 assert.equal(parseRequestTime('내일 오후 두시',Date.parse('2026-12-31T23:59:00+09:00')).requestedAt,Date.parse('2027-01-01T14:00:00+09:00'));
});
test('시간: 시각과 기간을 구분하고 없는 날짜·시각을 만들지 않는다',()=>{
 assert.equal(parseRequestTime('두 시간 뒤 밥먹자',now).requestedAt,Date.parse('2026-09-30T03:10:00+09:00'));
 for(const text of ['내일 밥먹자','내일 두시나 세시','내일 오전 25시','2월 30일 오후 두시','내일 오후 두시 90분','다음주 월요일 오후 두시'])assert.equal(parseRequestTime(text,now).kind,'review',text);
 const r=applyRequestTime({requestedAt:'2026-10-01T14:00:00+09:00',needsReview:false},'밥 좀 도와줘',now);assert.equal(r.requestedAt,null);assert.equal(r.timeNeedsReview,false);
});
