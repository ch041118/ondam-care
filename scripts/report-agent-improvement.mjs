import { readFileSync,writeFileSync,mkdirSync,copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const beforePath='output/agent-evaluation-verified-1000-2026-10-31';
const afterPath='output/agent-evaluation-improved-live-final-2026-11-01';
const basicPath='output/agent-evaluation-improved-basic-final2-2026-11-01';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const before=json(beforePath+'/summary.json'),after=json(afterPath+'/summary.json'),basic=json(basicPath+'/summary.json');
if(before.datasetHash!==after.datasetHash||after.executed!==1000||basic.executed!==1000)throw Error('동일한 전체 회귀 세트가 필요합니다.');
for(const [file,hash]of Object.entries(after.hashes))if(createHash('sha256').update(readFileSync(file)).digest('hex')!==hash)throw Error('검증 후 소스가 변경됨: '+file);
const previous=new Map(json(beforePath+'/results.json').map(r=>[r.id,r])),current=json(afterPath+'/results.json');
const added=json('output/agent-paraphrases-final-2026-11-01/results.json');
const out='outputs/agent-improvement-2026-11-01';mkdirSync(out,{recursive:true});
const cell=s=>'"'+String(s??'').replaceAll('"','""')+'"';
const rows=current.map(r=>[r.id,r.category,r.actor,r.question,r.expectedText,previous.get(r.id).pass?'통과':'실패',r.pass?'통과':'실패',r.execution,previous.get(r.id).failures.join(' / '),r.failures.join(' / '),r.answer,r.ms]);
writeFileSync(out+'/비서_1000개_개선전후.csv','\uFEFF'+[['ID','분류','역할','질문','기대 결과','개선 전','개선 후','실행 경로','이전 실패 사유','현재 실패 사유','현재 답변','시간(ms)'],...rows].map(r=>r.map(cell).join(',')).join('\r\n'));
copyFileSync('output/agent-paraphrases-final-2026-11-01/results.json',out+'/추가_자연어_검증.json');
const report=`# 비서 개선 및 재검증 — 2026-11-01

동일한 1,000개 합성 시나리오: **${before.passed}/1,000 → ${after.passed}/1,000 통과**. 기존 질문·기대값·고정 기준시각(2026-10-31 09:00 KST)을 유지했고 과거 결과를 재사용하지 않고 전부 재실행했다.

| 항목 | 개선 전 | 개선 후 |
|---|---:|---:|
${after.groups.map(g=>`| ${g.category} | ${before.groups.find(x=>x.category===g.category).passed}/${g.executed} | ${g.passed}/${g.executed} |`).join('\n')}
| 전체 통과 | ${before.passed}/1,000 | ${after.passed}/1,000 |
| 중앙 처리시간 | ${before.medianMs} ms | ${after.medianMs} ms |
| p95 처리시간 | ${before.p95Ms} ms | ${after.p95Ms} ms |

## 변경 사항

- 명확한 조회는 권한 범위 내 원본을 기준으로 도구·날짜·상태·대상을 해석한다. 범위를 해석하지 못한 복합 질문은 조건을 버리지 않고 모델에 넘긴다. 모델이 없으면 조건을 다시 요청한다.
- 후속 질문은 직전 도구와 기간·대상을 유지하고 새 질문은 이전 필터를 초기화한다.
- 주의사항·근무 요일과 시간·통계·시간표는 실제 조회값을 답변 본문에 표시한다.
- 명시적 근무·어르신 기록·안부 완료 요청은 변경안을 만든다. 사용자 확인 전 저장 금지, 취소, 충돌 검사, 중복 적용 방지 및 역할 제한은 유지한다.
- 요일 인자는 일요일=0 기준을 명시하고 확인 화면은 숫자 대신 한글 요일로 표시한다. 선택 인자의 null만 생략하며 필수 값과 잘못된 인자의 검증은 유지한다.
- 새 라우터의 윤년·월 경계·새 이름과 근무시간·복합 조건·확인 절차 등 28개 회귀 검사를 추가했다. 전체 자동 테스트 **347개 통과**.

## 실행 경로와 해석

실제 모델 연결 환경(Qwen3:4b)에서 서버 규칙 처리 ${after.executionCounts.rules}건, 모델 처리 ${after.executionCounts.model}건, 계정 권한 단계 거절 ${after.executionCounts.rejected}건이었다. 따라서 이 수치는 모델 자체의 정답률 100%를 의미하지 않는다. 명확한 질의를 규칙으로 처리하는 비서 프로그램 전체의 회귀 결과다. 모델 미연결 경로도 ${basic.passed}/1,000 통과했다.

처리시간은 합성 인메모리 업무 데이터에 대한 단일 시나리오 측정이다. 0 ms는 반올림 값이며 HTTP·음성 인식·동시 사용자 부하 성능이 아니다. 신규 자연어 표현의 결과는 아래 별도로 기록한다. 기존 1,000개는 수정에 사용한 개발용 세트이며 독립 사용자 표본이 아니다.

추가 자연어 질문의 첫 실행은 4/6 통과였다. 미처리 표현 및 상대 월 필터 보정 후 같은 6개도 재검증했다. 따라서 아래 세트 역시 최종 수정에 사용되었으며 독립 최종 평가로 주장하지 않는다.

## 추가 자연어 표현 (${added.filter(r=>r.pass).length}/${added.length} 통과)

| 질문 | 결과 | 관찰 사항 |
|---|---|---|
${added.map(r=>`| ${r.question} | ${r.pass?'통과':'실패'} | ${r.failures.join(', ')||r.response.execution} |`).join('\n')}

## 결과 파일

- 개선 전후 상세표: \`${out}/비서_1000개_개선전후.csv\`
- 모델 연결 원본 결과·기대값·소스 해시: \`${afterPath}/\`
- 추가 자연어 전체 응답: \`${out}/추가_자연어_검증.json\`
- 기존 결과: \`${beforePath}/\` (보존)

실제 운영 데이터는 수정하지 않았다. 샌드박스의 임시 파일 rename 및 로컬 소켓 제한으로 첫 실행이 중단되어, 동일 테스트를 제한 밖에서 재실행했다. 자동 테스트 최종 실행은 모두 통과했고, 소켓 연결에 실패한 미완료 실행은 비교에서 제외했다.
`;
writeFileSync(out+'/비서_개선결과.md',report);writeFileSync('docs/AGENT-IMPROVEMENT.md',report);
console.log(JSON.stringify({out,before:before.passed,after:after.passed,extra:added.filter(r=>r.pass).length,totalExtra:added.length}));
