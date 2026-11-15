import fs from 'node:fs';
import {interpretText} from '../lib/integrations.mjs';
const corpus=JSON.parse(fs.readFileSync('test/fixtures/interpretation-200.json','utf8'));const out='artifacts/interpretation-200';fs.mkdirSync(out,{recursive:true});
const nativeFetch=globalThis.fetch;let raw=null;
globalThis.fetch=async(...args)=>{const r=await nativeFetch(...args);try{const a=await r.clone().json();raw=JSON.parse(a.message.content);}catch{}return r;};
const results=fs.existsSync(out+'/results.json')?JSON.parse(fs.readFileSync(out+'/results.json','utf8')).results:[];
const stamp=t=>t==null?null:new Date(t).toISOString();
for(const c of corpus.cases.slice(results.length)){
 raw=null;const start=Date.now();let actual,error;try{actual=await interpretText(c.text,Date.parse(corpus.now));}catch(e){error=e.message;}
 const checks={service:!error&&(c.expected.service===null||actual.service===c.expected.service),review:!error&&actual.needsReview===c.expected.needsReview,time:!error&&stamp(actual.requestedAt)===stamp(c.expected.requestedAt)};
 results.push({...c,raw,actual,error,checks,pass:Object.values(checks).every(Boolean),durationMs:Date.now()-start});
 fs.writeFileSync(out+'/results.json',JSON.stringify({model:process.env.OLLAMA_MODEL,referenceTime:corpus.now,evaluatedAt:new Date().toISOString(),total:results.length,passed:results.filter(r=>r.pass).length,results},null,2));
 console.log(`${c.id} ${results.at(-1).pass?'PASS':'FAIL'} ${Date.now()-start}ms ${error||''}`);
}
