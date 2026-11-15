// Additional natural phrasing checks, separate from the 1,000-case regression corpus.
import { writeFileSync,mkdirSync } from 'node:fs';
import { createAgentService } from '../lib/agent.mjs';
import { ensureAuth } from '../lib/auth.mjs';
import { ensureWellness } from '../lib/wellness.mjs';
import { fixture,actors,NOW } from './agent-eval-corpus.mjs';
import { startLocalVoice } from './local-voice.mjs';
const out=process.argv[process.argv.indexOf('--out')+1]&&process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'output/agent-paraphrases-2026-11-01';mkdirSync(out,{recursive:true});
const checks=[
 {question:'오늘 방문해야 하는 일정이 궁금해요.',tool:'get_schedule',args:{from:'2026-10-31',to:'2026-10-31'},total:4},
 {question:'제 근무시간과 일하는 요일을 알려주세요.',tool:'get_caregiver',alternate:'list_caregivers',fact:/8시.*20시/s},
 {question:'김영자 어르신 돌볼 때 주의할 점이 있나요?',tool:'get_elder',alternate:'list_elders',fact:/계단.*주의/s},
 {question:'접수 내역 중에서 아직 처리가 안 된 건만 보고 싶어요.',tool:'list_requests',args:{status:'unprocessed'},total:4},
 {question:'이번 달에 접수된 요청 통계를 요약해 주세요.',tool:'get_statistics',alternate:'get_report',args:{from:'2026-10-01',to:'2026-10-31'},total:10},
 {question:'근무하는 날과 시간이 어떻게 등록되어 있는지 확인 부탁드립니다.',tool:'get_caregiver',alternate:'list_caregivers',fact:/8시.*20시/s},
 ];
const stop=await startLocalVoice(process.cwd()),results=[];
try{
 for(const c of checks){
  const db=ensureAuth(ensureWellness(fixture()));
  const service=createAgentService({getDb:()=>db,commit:f=>f(db),clock:()=>NOW});
  let response,failures=[];
  try{response=await service.chat(actors.carerA,{message:c.question});
   const target=response.traces.findLast(t=>!t.result.error&&(t.name===c.tool||t.name===c.alternate));
   if(!target)failures.push('필수 조회 누락');
   if(c.total!=null&&target?.result.total!==c.total)failures.push('전체 건수 불일치');
   for(const [k,v]of Object.entries(c.args||{}))if(target?.arguments[k]!==v)failures.push('조회 조건 불일치: '+k);
   if(c.fact&&!c.fact.test(response.answer))failures.push('답변의 핵심 사실 누락');
  }catch(e){response={error:e.message};failures.push('실행 오류');}
  results.push({question:c.question,expected:{tool:c.tool,alternate:c.alternate,args:c.args,total:c.total,fact:String(c.fact||'')},pass:!failures.length,failures,response});
  writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify({done:results.length,pass:!failures.length,question:c.question,failures}));
 }
}finally{stop();}
