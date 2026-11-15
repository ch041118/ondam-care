import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseRequestTime} from '../lib/request-time.mjs';
import {classifyWellnessReply} from '../lib/wellness.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const times=read('request-times.json');
for(const c of times.cases)test('모크 시간: '+c.text,()=>{const r=parseRequestTime(c.text,Date.parse(times.now));assert.equal(r.kind,c.at?'resolved':c.kind);assert.equal(r.requestedAt,c.at?Date.parse(c.at):null);});
for(const c of read('wellness-replies.json'))test('모크 안부: '+JSON.stringify(c.text),()=>assert.equal(classifyWellnessReply(c.text),c.outcome));
