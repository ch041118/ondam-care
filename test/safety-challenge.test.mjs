import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyRequestReview} from '../lib/request-review.mjs';
const cases=JSON.parse(readFileSync(new URL('./fixtures/safety-challenge.json',import.meta.url),'utf8'));
for(const c of cases)test('추가 위험 입력: '+c.text,()=>{
 const r=applyRequestReview({service:'식사 도움',needsReview:false},c.text);
 assert.equal(r.needsReview,c.review);if(c.service)assert.equal(r.service,c.service);
});
