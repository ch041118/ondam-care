import fs from 'node:fs';
import {interpretText} from '../lib/integrations.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('../test/fixtures/voice-intents.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
const results=[];
for(const c of cases){try{const r=await interpretText(c.text,Date.parse('2026-09-30T01:09:48+09:00'));const pass=(!c.service||r.service===c.service)&&(c.review===undefined||r.needsReview===c.review);results.push({text:c.text,expected:c,actual:{service:r.service,needsReview:r.needsReview,requestedAt:r.requestedAt},pass});console.log(JSON.stringify(results.at(-1)));}catch(e){results.push({text:c.text,pass:false,error:e.message});console.log(e.message);}}
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/voice-evaluation.json',JSON.stringify({evaluatedAt:new Date().toISOString(),model:process.env.OLLAMA_MODEL,total:results.length,passed:results.filter(r=>r.pass).length,results},null,2));
console.log(`Passed ${results.filter(r=>r.pass).length}/${results.length}`);if(results.some(r=>!r.pass))process.exitCode=1;
