import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseRequestTime,applyRequestTime} from '../lib/request-time.mjs';
import {applyRequestReview} from '../lib/request-review.mjs';
import {classifyWellnessReply} from '../lib/wellness.mjs';
import {interpretText} from '../lib/integrations.mjs';

const live=process.argv.includes('--live');
if(live&&!process.env.OLLAMA_MODEL)throw Error('실제 모델 평가에는 OLLAMA_MODEL 설정이 필요합니다.');
const files=['request-times.json','voice-intents.json','wellness-replies.json','safety-challenge.json'];
const raw=files.map(f=>readFileSync(new URL('../test/fixtures/'+f,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const [times,intents,wellness,safety]=raw.map(JSON.parse),now=Date.parse(times.now),results=[];
async function run(group,input,expected,fn,check){const start=performance.now();try{const actual=await fn();results.push({group,input,expected,actual,pass:check(actual),ms:Math.round((performance.now()-start)*100)/100});}catch(e){results.push({group,input,expected,pass:false,error:e.message,ms:Math.round(performance.now()-start)});}}
for(const c of times.cases)await run('시간 규칙',c.text,c,()=>parseRequestTime(c.text,now),r=>r.kind===(c.at?'resolved':c.kind)&&r.requestedAt===(c.at?Date.parse(c.at):null));
for(const c of [...intents,...safety])await run('돌봄 안전 규칙',c.text,c,()=>applyRequestReview(applyRequestTime({service:'식사 도움',needsReview:false},c.text,now),c.text),r=>(!c.service||r.service===c.service)&&(c.review===undefined||r.needsReview===c.review));
for(const c of wellness)await run('안부 규칙',c.text,c,()=>classifyWellnessReply(c.text),r=>r===c.outcome);
if(live)for(const c of [...intents,...safety])await run('실제 LLM + 규칙',c.text,c,()=>interpretText(c.text,now),r=>(!c.service||r.service===c.service)&&(c.review===undefined||r.needsReview===c.review));
const groups=[...new Set(results.map(r=>r.group))].map(group=>{
 const rows=results.filter(r=>r.group===group),latencies=rows.map(r=>r.ms).sort((a,b)=>a-b),risks=rows.filter(r=>r.expected.review===true),unsafe=risks.filter(r=>r.actual?.needsReview===false);
 return {group,total:rows.length,passed:rows.filter(r=>r.pass).length,p95Ms:latencies[Math.ceil(latencies.length*.95)-1],safetyCases:risks.length,unsafeAutoCount:unsafe.length,errors:rows.filter(r=>r.error).length};
});
const report={evaluatedAt:new Date().toISOString(),referenceTime:times.now,mode:live?'local-model-and-rules':'rules-only',model:live?process.env.OLLAMA_MODEL:null,datasetSha256:createHash('sha256').update(raw.join('\n')).digest('hex'),limitations:['개발자가 작성한 합성 회귀 데이터이며 독립 평가셋이 아닙니다.','규칙 통과율은 음성 인식 정확도나 LLM 단독 정확도가 아닙니다.','실제 어르신 음성·사용자 실증·노동 절감 효과는 미측정입니다.','위험 입력 검출은 제한된 회귀 사례만 검증하며 모든 위험을 포괄하지 않습니다.'],groups,results};
mkdirSync('artifacts',{recursive:true});
const base=live?'artifacts/rubric-live-evaluation':'artifacts/rubric-evaluation';
writeFileSync(base+'.json',JSON.stringify(report,null,2));
writeFileSync(base+'.md',`# CLover 재현 평가\n\n실행: ${report.evaluatedAt}\n\n모드: ${report.mode}\n\n데이터 SHA-256: ${report.datasetSha256}\n\n| 평가 | 통과 / 전체 | 오류 | p95 처리시간(ms) | 위험 사례 중 자동처리 판정 |\n|---|---:|---:|---:|---:|\n${groups.map(g=>`| ${g.group} | ${g.passed} / ${g.total} | ${g.errors} | ${g.p95Ms} | ${g.safetyCases?g.unsafeAutoCount+' / '+g.safetyCases:'해당 없음'} |`).join('\n')}\n\n## 해석의 한계\n\n${report.limitations.map(x=>'- '+x).join('\n')}\n\n## 실패 사례\n\n${results.filter(r=>!r.pass).map(r=>'- '+r.group+': '+r.input+' — '+(r.error||'기대값 불일치')).join('\n')||'이 실행에서 실패 없음'}\n`);
console.log(JSON.stringify({mode:report.mode,groups,report:base+'.md'},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
