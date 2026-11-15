import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve('output'),live=resolve(root,'agent-evaluation-verified-1000-2026-10-31'),basic=resolve(root,'agent-evaluation-basic-verified-1000-2026-10-31');
const load=p=>({summary:JSON.parse(readFileSync(p+'/summary.json')),results:JSON.parse(readFileSync(p+'/results.json'))});
const model=load(live),fallback=load(basic),cases=JSON.parse(readFileSync(live+'/cases.json')),byId=new Map(cases.map(c=>[c.id,c]));
const classify=r=>{
 const text=r.failures.join(' / ');
 if(/노출|금지 도구 실행 성공|권한 밖 ID 조회 성공|거절 질문에서 업무 원본 변경/.test(text))return '권한·기밀·무단 변경';
 if(/실행 오류|변경 확인 실패/.test(text))return '실행·확인 오류';
 if(/필수 도구 미실행/.test(text))return '도구 선택·호출 실패';
 if(/변경 인자|변경안|확인 전|확인 후|취소 후|중복 적용/.test(text))return '변경 내용·확인 절차';
 if(/답변/.test(text))return '답변 정보 누락·불일치';
 return '조회 조건·원본 결과 불일치';
};
const failures=model.results.filter(r=>!r.pass),counts=new Map();for(const r of failures){const group=classify(r);counts.set(group,(counts.get(group)||0)+1);}
const severe=failures.filter(r=>classify(r)==='권한·기밀·무단 변경');
const roleCounts=[...new Set(model.results.map(r=>r.actor))].map(role=>{const rows=model.results.filter(r=>r.actor===role);return {role,executed:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length};});
const pct=(n,d)=>d?(100*n/d).toFixed(1)+'%':'미실행',cell=s=>String(s??'').replaceAll('|','/').replace(/\r?\n/g,' ');
const facts={model:model.summary,fallback:fallback.summary,failureGroups:Object.fromEntries(counts),roles:roleCounts,severeFailureIds:severe.map(r=>r.id)};
const dest=resolve('outputs/01a17d0b-335a-70c3-801c-5ee878542835');mkdirSync(dest,{recursive:true});writeFileSync(dest+'/evaluation-analysis.json',JSON.stringify(facts,null,2));
const examples=[];for(const group of counts.keys())examples.push(...failures.filter(r=>classify(r)===group).slice(0,4));
writeFileSync(dest+'/비서_1000개_검증결과.md',`# 비서 1,000개 질문 검증 결과\n\n고정 기준시각: 2026-10-31 09:00 KST. 실제 사용자 데이터 대신 고정 가상 데이터를 사용했습니다.\n\n실제 모델: **${model.summary.model}**, 실행 **${model.summary.executed}/1,000건**, 통과 **${model.summary.passed}건 (${pct(model.summary.passed,model.summary.executed)})**, 실패 **${model.summary.failed}건**, 미실행 **${model.summary.remaining}건**입니다.\n\n## 분류별 실제 모델 결과\n\n| 분류 | 실행 | 통과 | 실패 | 통과율 |\n|---|---:|---:|---:|---:|\n${model.summary.groups.map(g=>`| ${g.category} | ${g.executed} | ${g.passed} | ${g.failed} | ${pct(g.passed,g.executed)} |`).join('\n')}\n\n## 실패 유형\n\n| 유형 | 사례 수 |\n|---|---:|\n${[...counts].map(([k,v])=>`| ${k} | ${v} |`).join('\n')||'| 현재까지 실패 없음 | 0 |'}\n\n한 사례에 여러 실패 사유가 있으면 권한·실행 오류·도구 선택·변경·답변·원본 순으로 대표 유형을 정했습니다.\n\n자동 기준에서 확인한 권한·기밀·무단 변경 실패: **${severe.length}건**${severe.length?' ('+severe.map(r=>r.id).join(', ')+')':''}. 이 숫자는 제한된 합성 사례의 검사 결과이며 모든 공격에 대한 안전성을 보장하지 않습니다.\n\n## 역할별 결과\n\n| 역할 | 실행 | 통과 | 실패 |\n|---|---:|---:|---:|\n${roleCounts.map(r=>`| ${r.role} | ${r.executed} | ${r.passed} | ${r.failed} |`).join('\n')}\n\n## 대표 실패 사례\n\n| ID | 질문 | 기대 결과 | 실제 답변 발췌 | 실패 사유 |\n|---|---|---|---|---|\n${examples.map(r=>`| ${r.id} | ${cell((byId.get(r.id).setup?byId.get(r.id).setup+' → ':'')+r.question)} | ${cell(r.expectedText).slice(0,280)} | ${cell(r.answer||r.error).slice(0,280)} | ${cell(r.failures.join(' / '))} |`).join('\n')}\n\n## 기본 조회 모드\n\n모델을 사용하지 않는 기본 모드는 ${fallback.summary.executed}건 중 ${fallback.summary.passed}건 통과, ${fallback.summary.failed}건 실패입니다. 변경안 대화를 지원하지 않는 모드의 한계가 포함되므로 실제 모델 통과율과 합산하지 않습니다.\n\n## 판정 범위와 재현\n\n- 필수 도구, 원본 대상·건수·필터, 관찰 가능한 답변 수치, 기관·담당자 권한, 변경 확인·취소·중복 적용을 검사했습니다.\n- 기대 답변은 의미 기준의 예시입니다. 자유 서술의 모든 의미를 자동 판정하지 않았으며, Excel에 수동 검토 메모 열을 두었습니다.\n- 700개 조회, 100개 후속 질문, 100개 권한·우회, 100개 변경 확인 시나리오입니다. 표현 변형과 역할 조합이며 독립된 실제 사용자 1,000명 실험은 아닙니다.\n- 모델과 기본 모드는 동일 질문·고정 원본을 사용했습니다. 실제 모델 실행에 가짜 planner를 주입하지 않았습니다.\n- 실행 도중 생산 비서 코드를 수정하지 않았습니다. 소스·데이터 해시와 실행 기록은 각 결과 폴더의 manifest.json, cases.json, fixture.json, results.jsonl에 있습니다.\n- STT, 실제 어르신 발음·잡음, 브라우저, 동시 부하 및 장시간 운영 신뢰성은 이번 평가 대상이 아닙니다. 처리시간 중앙값 ${(model.summary.medianMs/1000).toFixed(1)}초, p95 ${(model.summary.p95Ms/1000).toFixed(1)}초는 개발 PC에서 한 시나리오를 끝내는 시간이며 서비스 용량 수치가 아닙니다.\n\nExcel은 질문·기대값·답변 발췌·실패 필터를 제공하며, HTML 결과표에는 실제 답변과 도구 결과 전문이 있습니다.\n`);
const original=load(resolve(root,'agent-evaluation-live-1000-2026-10-31'));
const text=readFileSync(dest+'/비서_1000개_검증결과.md','utf8');
writeFileSync(dest+'/비서_1000개_검증결과.md',text+`\n## 평가 데이터 보완 이력\n\n초기 1,000건은 ${original.summary.passed}건 통과, ${original.summary.failed}건 실패였습니다. 이후 기관 범위가 모호한 질문 105건을 명확히 하고, 동등한 조회 도구와 답변 본문의 핵심 사실을 판정하도록 140건을 보완했습니다. 또한 안부 변경 테스트 25건의 누락된 attentionAt 사전조건을 고쳤습니다. 바뀐 270건은 같은 비서 코드와 모델로 실제 재실행했고, 나머지는 질문·역할·기대값·원본·모델·생산 코드가 모두 같은 실제 응답만 재사용했습니다. 평가 기준과 데이터의 보완이며 프로그램 수정 효과를 뜻하지 않습니다. 초기 결과와 각 단계의 소스 스냅샷을 보관했습니다.\n\n안부 가상 기록의 사전조건 누락은 평가 데이터 오류로 확인했으며 제품 결함으로 집계하지 않았습니다. 100개 변경 시나리오는 모델을 거치지 않은 별도 테스트에서 준비·확인·취소의 유효한 사전조건을 검증했습니다.\n\n주요 기능 중심의 합성 시나리오입니다. 모든 도구의 모든 대화 표현·경계 조건을 균등하게 평가한 결과는 아닙니다.\n`);
const observations=[];
const wrongDate=model.results.find(r=>r.expected.range&&r.traces?.some(t=>['get_statistics','get_report'].includes(t.name)&&t.arguments?.from&&t.arguments.from!==r.expected.range[0]));
if(wrongDate){const t=wrongDate.traces.find(t=>['get_statistics','get_report'].includes(t.name)&&t.arguments?.from&&t.arguments.from!==wrongDate.expected.range[0]);observations.push(`${wrongDate.id}: 기간 기대값은 ${wrongDate.expected.range.join(' ~ ')}인데 ${t.arguments.from} ~ ${t.arguments.to||'미지정'}으로 조회했습니다.`);}
const wrongStatus=model.results.find(r=>byId.get(r.id).status==='pending'&&r.traces?.some(t=>t.name==='list_requests'&&t.arguments?.status==='draft'));
if(wrongStatus)observations.push(`${wrongStatus.id}: 수락 대기 요청에 초안 상태(draft) 필터를 사용했습니다.`);
const nullArgs=model.results.find(r=>r.traces?.some(t=>t.result.error&&Object.values(t.arguments||{}).includes(null)));
if(nullArgs)observations.push(`${nullArgs.id}: 선택 인자에 null을 전달해 도구 인자 검증에서 실패했습니다.`);
const noFacts=model.results.find(r=>byId.get(r.id).intent==='notes'&&r.failures.some(f=>f.includes('답변 본문')));
if(noFacts)observations.push(`${noFacts.id}: 주의사항 데이터를 조회했지만 답변 본문은 “${cell(noFacts.answer).slice(0,140)}”로 끝났습니다.`);
const wrongDays=model.results.find(r=>r.failures.some(f=>f.includes('변경 인자 불일치: days')));
if(wrongDays){const t=wrongDays.traces.findLast(t=>t.name==='propose_work_hours');observations.push(`${wrongDays.id}: 기대 근무 요일 코드 [${byId.get(wrongDays.id).args.days}]와 실제 변경안 [${t.arguments.days}]가 달랐습니다. 이 앱의 0은 일요일입니다.`);}
writeFileSync(dest+'/비서_1000개_검증결과.md',readFileSync(dest+'/비서_1000개_검증결과.md','utf8')+'\n## 확인된 재현 문제\n\n'+observations.map(s=>'- '+s).join('\n')+'\n');
console.log(JSON.stringify({executed:model.summary.executed,passed:model.summary.passed,failed:model.summary.failed,severe:severe.length,failureGroups:Object.fromEntries(counts)},null,2));
