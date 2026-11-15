import test from 'node:test';
import assert from 'node:assert/strict';
import { dateFilters,routeRequest,normalizeModelArguments } from '../lib/agent-routing.mjs';
import { createAgentService } from '../lib/agent.mjs';
import { toolCatalog,validateToolArguments } from '../lib/agent-tools.mjs';
import { ensureAuth } from '../lib/auth.mjs';
import { ensureWellness } from '../lib/wellness.mjs';
const now=Date.parse('2028-03-01T00:05:00+09:00');
const user={id:'worker',role:'social',approvalStatus:'approved',organizationId:'center'};
function fixture(){return ensureAuth(ensureWellness({organizations:[{id:'center'}],accounts:[user],elders:[{id:'elder-44',name:'임새봄',organizationId:'center',specialNotes:'청력 저하',precautions:'큰 글씨로 안내'}],caregivers:[{id:'carer-77',name:'장겨울',organizationId:'center',days:[2,4],from:9.5,to:18.25}],requests:[{id:'visit-22',organizationId:'center',elderId:'elder-44',caregiverId:'carer-77',status:'pending',start:now+3600000,createdAt:now,duration:90,service:'생활 도움'}],checkins:[],attendance:[]}));}
const route=(text,db=fixture())=>routeRequest(text,{},undefined,db,user,now,toolCatalog(user));

test('추천 질문의 일상 말투와 보고서 요청은 모델 없이 처리하고 추가 조건은 버리지 않는다',()=>{
 const count=route('오늘 요청 몇 건이야?');
 assert.equal(count.calls[0].name,'get_statistics');
 assert.equal(count.calls[0].arguments.from,'2028-03-01');
 assert.equal(count.calls[0].arguments.to,'2028-03-01');
 assert.equal(route('이번 주 보고서 만들어줘').calls[0].name,'get_report');
 assert.equal(route('오늘 병원 동행 요청 몇 건이야?'),null);
 assert.equal(route('오늘 완료 아닌 요청 몇 건이야?'),null);
});
test('조회 후속 문장으로 직전 변경안을 다시 만들지 않는다',()=>{
 const result=routeRequest('그분 알려줘',{id:'carer-77',days:[1,3],from:9,to:18},'propose_work_hours',fixture(),user,now,toolCatalog(user));
 assert.deepEqual(result.calls,[]);
});
test('여러 상태 및 주별 집계는 모델이 나눈 조건을 덮어쓰지 않는다',()=>{
 assert.equal(route('미처리 완료 요청 보여줘'),null);
 const catalog=toolCatalog(user),status={name:'list_requests',arguments:{status:'completed'}};
 normalizeModelArguments(status,catalog,{message:'미처리 완료 요청 보여줘',now});assert.equal(status.arguments.status,'completed');
 const weekly={name:'get_statistics',arguments:{from:'2028-03-01',to:'2028-03-05'}};
 normalizeModelArguments(weekly,catalog,{message:'이번 달 주별 통계',now});assert.equal(weekly.arguments.to,'2028-03-05');
});
for(const [text,expected]of [
 ['어제 요청',{from:'2028-02-29',to:'2028-02-29'}],
 ['모레 일정',{from:'2028-03-03',to:'2028-03-03'}],
 ['이번 주 일정',{from:'2028-02-28',to:'2028-03-05'}],
 ['지난 달 통계',{from:'2028-02-01',to:'2028-02-29'}],
 ['다음 달 보고서',{from:'2028-04-01',to:'2028-04-30'}],
 ['2028-02-28부터 2028-03-03까지 요청',{from:'2028-02-28',to:'2028-03-03'}],
 ['오늘과 내일 비교',null],['2028-03-01과 오늘 비교',null],['최근 3일 요청',null],['금요일 일정',null],
 ])test('한국 날짜 해석: '+text,()=>assert.deepEqual(dateFilters(text,now),expected));
for(const text of ['병원 동행 요청만 보여줘','완료 아닌 요청 보여줘','오늘과 내일 각각 일정 보여줘','임새봄과 다른 어르신 요청 보여줘','오후 일정 보여줘','요청 2건만 보여줘','요청 목록과 통계 같이 보여줘']){
 test('지원하지 않은 조건을 버리지 않는다: '+text,()=>assert.equal(route(text),null));
}
test('이름·근무·주의사항은 새 데이터에서 해석하고 본문으로 반환한다',async()=>{
 const db=fixture(),service=createAgentService({getDb:()=>db,commit:f=>f(db),env:{},clock:()=>now});
 const notes=await service.chat(user,{message:'임새봄 어르신의 주의사항 알려줘'});
 assert.equal(notes.traces[0].arguments.id,'elder-44');assert.match(notes.answer,/큰 글씨로 안내/);
 const hours=await service.chat(user,{message:'장겨울 보호사의 근무 요일과 시간 알려줘'});
 assert.match(hours.answer,/화요일·목요일/);assert.match(hours.answer,/9시 30분 ~ 18시 15분/);
});
test('같은 이름의 어르신은 되묻고 조회하지 않는다',()=>{
 const db=fixture();db.elders.push({...db.elders[0],id:'elder-45'});
 assert.deepEqual(route('임새봄 어르신의 주의사항 알려줘',db).calls,[]);
});
test('일정 후속 질문은 방문일과 도구를 유지하고 새 질문은 조건을 초기화한다',async()=>{
 const db=fixture(),service=createAgentService({getDb:()=>db,commit:f=>f(db),env:{},clock:()=>now});
 const first=await service.chat(user,{message:'오늘 일정 보여줘'});
 const next=await service.chat(user,{message:'그중 수락 대기만 보여줘',conversationId:first.conversationId});
 assert.equal(next.traces[0].name,'get_schedule');assert.deepEqual(next.traces[0].arguments,{from:'2028-03-01',to:'2028-03-01',status:'pending'});
 const all=await service.chat(user,{message:'전체 요청 목록 보여줘',conversationId:first.conversationId});
 assert.deepEqual(all.traces[0].arguments,{});
});
test('명시적인 변경안은 요일을 보존하고 확인 전에는 저장하지 않는다',async()=>{
 const db=fixture(),service=createAgentService({getDb:()=>db,commit:f=>f(db),env:{},clock:()=>now});
 const response=await service.chat(user,{message:'장겨울 보호사(carer-77)의 근무를 화·목·토요일 7시부터 16.5시로 변경안만 만들어줘.'});
 assert.deepEqual(db.caregivers[0].days,[2,4]);assert.deepEqual(db.agentProposals[0].args.days,[2,4,6]);
 assert.match(response.traces[0].result.summary,/화·목·토요일/);
 await service.confirm(user,{proposalId:response.traces[0].result.proposalId,decision:'confirm'});
 assert.deepEqual(db.caregivers[0].days,[2,4,6]);assert.equal(db.caregivers[0].to,16.5);
});
for(const text of ['장겨울 근무를 월요일부터 금요일 9시부터 18시로 변경해줘','장겨울 근무를 월·수요일 오전 9시부터 오후 6시로 변경해줘','장겨울 근무를 월·수요일 9시부터 18시로 변경하지 마','장겨울 근무를 월·수요일 9시부터 18시로 변경하고 금요일도 추가해줘']){
 test('모호하거나 복합적인 변경을 임의로 제안하지 않는다: '+text,()=>assert.equal(route(text),null));
}
test('선택 null만 생략하고 필수 null·알 수 없는 필드는 여전히 거절한다',()=>{
 const catalog=toolCatalog(user),call={name:'list_requests',arguments:{caregiverId:null,query:null}};
 normalizeModelArguments(call,catalog);assert.deepEqual(call.arguments,{});
 const invalid={name:'get_elder',arguments:{id:null}};normalizeModelArguments(invalid,catalog);
 assert.throws(()=>validateToolArguments(catalog.find(t=>t.name==='get_elder'),invalid.arguments));
 const unknown={name:'list_requests',arguments:{unknown:null}};normalizeModelArguments(unknown,catalog);
 assert.throws(()=>validateToolArguments(catalog.find(t=>t.name==='list_requests'),unknown.arguments));
});
test('모델이 연결되어 있어도 명확한 조회는 모델 호출 없이 실행된다',async()=>{
 const db=fixture(),service=createAgentService({getDb:()=>db,commit:f=>f(db),env:{OLLAMA_MODEL:'unreachable-model',OLLAMA_URL:'http://127.0.0.1:1'},clock:()=>now});
 const result=await service.chat(user,{message:'전체 돌봄 요청 통계 알려줘'});
 assert.equal(result.execution,'rules');assert.match(result.answer,/접수 1건/);
});
test('모델의 상대 월·미처리 상태 오류를 모든 해당 조회 도구에서 보정한다',async()=>{
 const db=fixture();let step=0;
 const service=createAgentService({getDb:()=>db,commit:f=>f(db),clock:()=>now,planner:async()=>step++%2===0?{answer:'',calls:[{name:'get_statistics',arguments:{from:'2028-03-01',to:'2028-03-31'}}]}:{answer:'답변',calls:[]}});
 const report=await service.chat(user,{message:'지난 달에 접수된 요청 통계를 요약해 주세요.'});
 assert.deepEqual(report.traces[0].arguments,{from:'2028-02-01',to:'2028-02-29'});
 const call={name:'list_requests',arguments:{status:'pending',query:null}};
 normalizeModelArguments(call,toolCatalog(user),{message:'접수 내역 중 아직 처리가 안 된 건만 보고 싶어요.',now});
 assert.deepEqual(call.arguments,{status:'unprocessed'});
 const comparison={name:'get_statistics',arguments:{from:'2028-02-01',to:'2028-02-29'}};
 normalizeModelArguments(comparison,toolCatalog(user),{message:'지난 달과 이번 달 각각 비교해줘',now});
 assert.deepEqual(comparison.arguments,{from:'2028-02-01',to:'2028-02-29'});
});

test('모델의 상속 프로퍼티 null을 선택 인자로 오인해 지우지 않는다',()=>{
 const catalog=toolCatalog(user),call={name:'list_requests',arguments:JSON.parse('{"constructor":null,"__proto__":null}')};
 normalizeModelArguments(call,catalog);assert.ok(Object.hasOwn(call.arguments,'constructor'));assert.ok(Object.hasOwn(call.arguments,'__proto__'));
 assert.throws(()=>validateToolArguments(catalog.find(t=>t.name==='list_requests'),call.arguments),/지원하지 않는 인자/);
});
