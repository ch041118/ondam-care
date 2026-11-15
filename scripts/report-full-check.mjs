import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out='outputs/full-check-2026-11-02',live='output/full-check-live-final-2026-11-02';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const agent=json(live+'/summary.json'),http=json(out+'/http-summary.json'),rubric=json('artifacts/rubric-live-evaluation.json'),load=json(out+'/load-and-duplicate.json');
if(agent.executed!==1000)throw Error('모델 평가 미완료');
for(const [path,hash]of Object.entries(agent.hashes))if(createHash('sha256').update(readFileSync(path)).digest('hex')!==hash)throw Error('평가 후 소스 변경: '+path);
const unit=readFileSync('tmp/full-tests-final2.log','utf8'),pass=Number(unit.match(/pass (\d+)/)?.[1]),fail=Number(unit.match(/fail (\d+)/)?.[1]);
if(pass!==364||fail!==0)throw Error('최종 테스트 수 확인 필요');
copyFileSync('artifacts/rubric-live-evaluation.json',out+'/interpretation-rules.json');
copyFileSync(live+'/summary.json',out+'/agent-summary.json');
copyFileSync(live+'/기대결과와실제답변.csv',out+'/비서_1000개_최종결과.csv');
const areas=[
 ['로그인·가입·승인·로그아웃','자동 테스트 + HTTP + 역할별 웹 로그인','승인 대기 거절, 관리자 승인 조회, 토큰 폐기, 쿠키 출처 검사'],
 ['역할·기관 분리','자동 테스트 + HTTP + 웹','관리자 60·복지사 30·보호사 10건, 보호사 어르신 2명 범위'],
 ['요청 상태·검색·상세·이력','자동 테스트 + HTTP + 웹','필터 카드 연결, 검색 빈 결과, 수락·완료·중복 처리 제한'],
 ['일정 조율·배정','자동 테스트 + HTTP + 웹 폼','가능 보호사, 승인 계정 없는 보호사 거절, 승인 보호사 확인 후 재신청'],
 ['어르신 요청 확인·수정·취소·확정 확인','자동 테스트 + 어르신 화면 미리보기','검토·중복·오래된 revision·잘못된 대상 거절; 실제 연결 계정 웹 로그인은 미실행'],
 ['시간표·주간 이동','자동 테스트 + 웹','한국 주간 경계, 보호사 선택, 다음 주·빈 주, 어르신 일정 탭'],
 ['어르신 관리·개인정보·주의사항','자동 테스트 + HTTP + 웹','목록 마스킹, 검색·상세, 부분 수정·다른 기관 거절'],
 ['보호사 근무·지역·서비스','자동 테스트 + HTTP + 웹','시간·요일 검증, 본인 근무만 수정, 기존 예약 유지'],
 ['비서 대화·후속 질문·모든 조회 도구','실제 모델 1,000개 + HTTP + 웹','실행 경로와 전체 건수·본문 사실·기간·권한 확인'],
 ['변경안 4종·확인·취소·충돌','자동 테스트 + HTTP','본인 근무·어르신 기록·안부 완료·일정 변경, 타인 확인 거절, 중복 적용 방지'],
 ['안부·재알림·미응답·완료','자동 테스트 + HTTP + 웹 체험','2회 재알림 후 확인 필요 전환·연락 결과 완료; 실제 푸시 전송 안 함'],
 ['출석','자동 테스트 + HTTP','같은 어르신·한국 날짜 중복 방지'],
 ['마이크·음성 실패·녹음 이관','자동 테스트 + 웹 권한 대기','취소·권한 거절·20초 제한·기기 종료·재시도·직원 재생 경로. 실제 마이크 오디오 수집 미실행'],
 ['요청 해석·시간·안부 규칙','규칙 + 실제 모델 32개','아래 그룹별 평가 결과 참조; 실제 음성 인식 정확도 아님'],
 ['주소·외부 연결','자동 테스트 + HTTP 오류 경로','잘못된 주소 거절; 실제 유효 주소 검색·자동 입력·공급자 장애 전수 검증 미실행'],
 ['오류 복구·입력 보존·화면 복귀','자동 테스트 + 웹','초기 로그인 상태, 만료, 재시도, 이전 결과 제거, 메뉴 왕복'],
 ['기초 동시성·중복 확인','로컬 HTTP 100회 동시 10개 + 확인 10개','모든 조회 성공, 변경은 1회만 적용. 생산 동시 사용자 한계 아님'],
 ['모바일 프로젝트·번들·권한','공유 번들 빌드 + cap copy + verify:mobile','Android/iOS 자산 동기화·권한/메타데이터. Java/Swift 컴파일·실기기 시험 미실행'],
 ];
writeFileSync(out+'/coverage.json',JSON.stringify(areas.map(([area,method,evidence])=>({area,method,evidence})),null,2));
const report=`# 기능 전반 점검 결과 — 2026-11-02

별도 합성 데이터와 테스트 계정만 사용했다. 제품에 이미 구현된 기능을 자동 검사·실제 HTTP·브라우저 화면으로 나누어 점검했다. 모든 기기와 외부 서비스에서 문제가 없다는 보장은 아니다.

## 최종 결과

- 전체 자동 테스트: **${pass}개 통과, ${fail}개 실패**.
- HTTP 업무 시나리오: **${http.passed}/${http.total} 통과**. 21개 조회 도구(주소는 잘못된 입력 거절), 네 종류 변경안과 인증·권한·확인·취소·충돌·오류 입력을 포함한다.
- 실제 로컬 모델 연결 비서: **${agent.passed}/${agent.executed} 통과**. 서버 규칙 ${agent.executionCounts.rules}건, 모델 ${agent.executionCounts.model}건, 권한 단계 거절 ${agent.executionCounts.rejected}건. 이는 모델 자체 정답률이 아니다.
- 요청 해석 평가: ${rubric.groups.map(g=>g.group+' '+g.passed+'/'+g.total).join(', ')}.
- 상태 조회 ${load.readRequests}회(동시 ${load.concurrency}개) 성공. 동일 변경 확인 ${load.parallelConfirms}개 동시 요청에서 실제 적용 ${load.actualApplications}회. 로컬 p95 ${load.p95Ms}ms이며 동시 사용자 용량 추정 자료로 사용할 수 없다.
- 웹 및 공유 모바일 번들 빌드, Android/iOS 자산 복사 및 메타데이터·권한 검증 통과.

## 이번에 수정한 문제 5개

1. 초기 인증 전 화면 복귀 이벤트가 아직 없는 db.auth를 참조할 수 있는 문제를 방지했다.
2. 비서 도구 목록을 못 불러오면 대기 문구만 남던 문제를 고쳤다. 오류와 다시 불러오기 버튼을 표시한다.
3. 새 조회가 실패했을 때 이전 성공 결과가 남아 혼동되는 문제를 고쳤다. 요청 시작 시 이전 결과를 제거한다. 웹에서 오류 뒤 이전 30건 결과가 사라지고 입력값은 유지되는 것을 확인했다.
4. constructor·__proto__ 같은 스키마의 상속 키를 정상 인자로 취급할 수 있는 검증을 보완했다. 선택 null 생략도 실제 정의된 키에만 적용한다.
5. 승인 시각이 없는 기록을 1970년으로 보여주던 표시를 ‘승인 시각 미등록’으로 바꿨다. 실제 웹에서 재확인했다.

## 기능별 범위

| 영역 | 방법 | 확인 내용·범위 |
|---|---|---|
${areas.map(r=>'| '+r.join(' | ')+' |').join('\n')}

웹에서는 사회복지사의 대시보드·상태 필터·검색·요청 상세·조율 폼·시간표·직원·어르신 관리·처리 내역·안부 체험(재알림→무응답→담당자 완료), 관리자의 승인 대기 화면, 보호사의 담당 범위와 메뉴, 어르신 부탁/시간표 탭·마이크 권한 대기 안내를 직접 조작했다. 관찰된 브라우저 콘솔 오류는 없었다. 실제 마이크 권한을 강제로 허용하거나 기기 연결 자격증명을 새로 사용하지 않았다.

## 남은 관찰 및 한계

- 첫 동시성 검사에서 변경안 생성이 1회 HTTP 400으로 거절됐다. 첫 실행의 코드가 응답 본문을 보존하지 않아 정확한 이유는 확정할 수 없다. 제품 코드 변경 없이 오류 본문을 기록하도록 검사기를 바꿔 재실행했을 때 조회 100회와 변경 확인 10회가 성공했다. 일회성 400의 원인은 미확인으로 남긴다(관찰 기록: load-first-observation.json, 원본 오류 출력은 대화 도구 기록에 보존).
- 실제 사용자 휴대폰·마이크·주변 소음, STT 전체 경로의 인식률, 푸시 수신, 앱 백그라운드, 실제 Safari/Chrome 다기기, STT/LLM 대규모 부하는 미검증이다. 설치된 합성 음성은 영어뿐이어서 임의의 한국어 합성 오디오 성적을 만들지 않았다.
- 어르신 신규 기기 연결·비밀번호 변경·직원 가입 승인은 기존 자동 테스트에서 확인했다. 이번 브라우저 조작에서는 새 연결 자격증명 사용이나 비밀번호 변경, 직원 승인 실행은 하지 않았다.
- 기본 오프라인 체험 모드의 비서·새 API 연동, 기관 관리자/팀장 계층, 주소 자동 입력 등 기존 미완료 요구는 docs/FEEDBACK-REMAINING.md에 남아 있다.
- 1,000개 대화와 요청 해석 데이터는 개발용 합성 회귀 세트이며 독립 실제 사용자 표본이 아니다. 검사 간 중복 사례가 있어 건수를 합쳐 독립 표본 수로 표시하지 않는다.

## 검사 데이터 보정 기록

초기 HTTP 61개 중 2개 실패는 기대값/조회 경로 오류였다. 유효하지 않은 주소는 503이 아니라 지도 서비스의 정상 400 거절이었고, 출석은 state 속성이 아니라 list_attendance 도구로 확인해야 했다. 이를 고쳐 전체 재실행했다. 추가한 일정 변경 1건은 승인 계정이 없는 ca2를 성공 대상으로 지정한 사전조건 오류였다. ca2의 정상 거절과 승인된 ca1의 확인 후 적용을 각각 재검증했다. 원본 실패 파일과 보정 이유를 http-initial-results.json, http-before-schedule-fixture-correction.json, http-results.json에 보존했다. 제품을 잘못된 기대값에 맞춰 바꾸지 않았다.

## 재현·증거

- scripts/setup-feature-check.mjs: 전용 tmp/full-feature-data 합성 원본 생성. 테스트 서버를 종료한 상태에서만 실행한다.
- scripts/check-features-http.mjs: 전용 localhost:34880 서버에 대한 62개 HTTP 검사. 초기 원본에서 실행한다.
- scripts/check-feature-concurrency.mjs: 전용 서버의 제한된 동시 조회·확인 점검.
- output/full-check-live-final-2026-11-02/: 질문·기대값·실제 답변·소스 해시·판정.
- 이 폴더의 http-results.json, http-summary.json, coverage.json, interpretation-rules.json, load-and-duplicate.json, 비서_1000개_최종결과.csv 및 웹 PNG.

변경된 제품 코드: public/app.js, public/agent-ui.js, public/auth-ui.js, lib/agent-tools.mjs, lib/agent-routing.mjs. 웹 번들과 Android/iOS 공유 웹 자산을 재생성했다. 실제 운영 기록은 수정하지 않았다.
`;
writeFileSync(out+'/기능전반_점검결과.md',report);writeFileSync('docs/FULL-CHECK-2026-11-02.md',report);
console.log(JSON.stringify({unit:pass,http:http.passed+'/'+http.total,agent:agent.passed+'/'+agent.executed,coverage:areas.length}));
