import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {applyRequestReview} from '../lib/request-review.mjs';import {applyRequestTime} from '../lib/request-time.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/voice-intents.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
for(const c of cases)test('모크 요청 보정: '+c.text,()=>{const model={service:'식사 도움',needsReview:false};const r=applyRequestReview(applyRequestTime(model,c.text,Date.parse('2026-09-30T01:09:48+09:00')),c.text);if(c.service)assert.equal(r.service,c.service);if(c.review!==undefined)assert.equal(r.needsReview,c.review);});
test('요청 보정: 모델이 다른 사유로 확인을 요구했다면 자동 해제하지 않는다',()=>{const r=applyRequestReview({service:'식사 도움',needsReview:true},'밥 좀 차려줘');assert.equal(r.needsReview,true);});
