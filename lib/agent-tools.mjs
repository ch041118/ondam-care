import { scopedState, canUseAgent, authError } from './auth.mjs';
import { organizationOf } from './organization.mjs';
import { resolveCandidates, seoulDay } from './scheduler.mjs';

const str=(description,extra={})=>({type:'string',description,...extra});
const id=str('조회 결과에서 얻은 정확한 ID');
const day=str('한국 날짜 YYYY-MM-DD');
const filters={elderId:id,caregiverId:id,status:str('상태. 요청: draft/pending/confirmed/attention/completed/cancelled 또는 active/unprocessed/change_requested'),from:day,to:day,query:str('이름 또는 내용 검색'),offset:{type:'integer',minimum:0,maximum:100000},limit:{type:'integer',minimum:1,maximum:100}};
const schema=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const tool=(name,description,properties={},required=[],extra={})=>({name,description,parameters:schema(properties,required),...extra});
export const READ_TOOLS=[
  tool('list_requests','돌봄 요청 목록. from/to는 접수일 기준. 상태·어르신·담당자·검색·페이지 조회',filters),
  tool('get_request','요청 상세: 해석 내용, 희망·배정 시간, 담당자, 확인·변경 요청, 전체 처리 이력',{id},['id']),
  tool('list_elders','어르신 목록과 검색. 특이·주의 사항 유무, 진행·조율 요청 필터',{query:filters.query,filter:str('notes/attention/active/none'),offset:filters.offset,limit:filters.limit}),
  tool('get_elder','어르신 상세와 특이·주의 사항. 방문 기록은 list_requests로 추가 조회',{id},['id']),
  tool('list_caregivers','요양보호사 목록, 근무 요일·시간·지역·서비스 조회',{query:filters.query,service:str('돌봄 종류'),offset:filters.offset,limit:filters.limit}),
  tool('get_caregiver','보호사의 상세 근무 설정과 담당 정보',{id},['id']),
  tool('get_schedule','주간/기간 시간표. from/to는 방문 예정일 기준이며 기본은 오늘부터 7일. pending은 미확정',{...filters}),
  tool('list_checkins','안부 확인 목록과 응답·연락 결과·미응답 처리 이력. 날짜와 어르신 필터',{elderId:id,status:filters.status,from:day,to:day,offset:filters.offset,limit:filters.limit}),
  tool('list_attendance','사용자+한국 날짜별 중복 없는 출석 기록',{elderId:id,from:day,to:day,offset:filters.offset,limit:filters.limit}),
  tool('get_wellness_settings','내 기관의 안부 확인 시간·횟수·활성화 설정'),
  tool('list_notifications','내 기관의 안부 알림 발송 상태. 토큰·비밀값은 반환하지 않음',{status:filters.status,elderId:id,from:day,to:day,offset:filters.offset,limit:filters.limit}),
  tool('list_devices','알림 기기 연결·권한 상태. 토큰은 제외',{offset:filters.offset,limit:filters.limit}),
  tool('list_approvals','관리자 전용 직원 가입 승인 목록·처리 이력',{role:str('caregiver 또는 social'),status:str('pending 또는 approved'),offset:filters.offset,limit:filters.limit},[],{adminOnly:true}),
  tool('list_organizations','접근 가능한 기관 목록과 기관별 구성원 수'),
  tool('get_account','현재 로그인한 계정의 역할·소속·세션 만료 시각. 인증 비밀값 제외'),
  tool('get_connections','음성·지도·에이전트·푸시 설정 여부. 실제 서비스 건강 상태와 구분'),
  tool('find_available_caregivers','조율 요청의 지정 일시에 배정 가능한 보호사. 자격·근무·중복·이동 여유 검사',{id,start:str('한국 오프셋 포함 ISO 일시'),service:str('녹음 검토 요청이면 돌봄 종류 필요')},['id','start']),
  tool('get_recording','인식 실패 요청의 녹음 존재 여부 및 보호된 재생 경로. 실제 음성은 별도 인증 API로 재생',{id},['id']),
  tool('get_statistics','기간별 실제 전체 데이터 집계. 접수·확정·미처리·변경 요청·완료·종류·담당자별 건수',{elderId:id,caregiverId:id,from:day,to:day}),
  tool('get_report','조회 조건에 따른 집계 보고서와 근거 요청 ID. 원본에 없는 사실은 생성하지 않음',{elderId:id,caregiverId:id,from:day,to:day}),
  tool('search_address','설정된 지도 서비스에서 주소 좌표 확인. 검색 결과만 반환하며 저장하지 않음',{address:str('검색할 도로명 주소',{maxLength:200})},['address'])
];
export const ACTION_TOOLS=[
 tool('propose_elder_notes','특이·주의 사항 변경안. 기존 내용을 조회하고 변경할 항목만 전달',{id,specialNotes:str('새 특이 사항 전체 내용',{maxLength:3000}),precautions:str('새 주의 사항 전체 내용',{maxLength:3000})},['id'],{mutation:true}),
 tool('propose_checkin_resolution','실제 연락 결과를 기록하고 안부 확인을 완료하는 변경안. 연락 사실 추측 금지',{id,note:str('연락 결과와 조치 내용',{maxLength:1000})},['id','note'],{mutation:true}),
  tool('propose_schedule_change','일정·담당자 변경안을 준비. 저장되지 않으며 사용자의 별도 확인 필요',{id,caregiverId:id,start:str('시간대 오프셋을 포함한 ISO 일시'),note:str('변경 사유',{maxLength:1000})},['id','caregiverId','start','note'],{mutation:true}),
  tool('propose_work_hours','보호사의 근무 요일·시간 변경안을 준비. 기존 예약 유지 여부 안내 후 별도 확인 필요',{id,days:{type:'array',description:'0=일요일, 1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일, 6=토요일. 평일은 [1,2,3,4,5]',items:{type:'integer',minimum:0,maximum:6},minItems:1,maxItems:7},from:{type:'number',minimum:0,maximum:24},to:{type:'number',minimum:0,maximum:24}},['id','days','from','to'],{mutation:true})
];
export const TOOL_REGISTRY=[...READ_TOOLS,...ACTION_TOOLS];
const CAREGIVER_TOOLS=new Set(['list_requests','get_request','list_elders','get_elder','list_caregivers','get_caregiver','get_schedule','list_checkins','list_attendance','get_account','get_connections','get_statistics','get_report','search_address','propose_work_hours']);
export function toolCatalog(user){if(!canUseAgent(user))throw authError('승인된 직원 계정에서 사용할 수 있습니다.',403);return TOOL_REGISTRY.filter(t=>(!t.adminOnly||user.role==='admin')&&(user.role!=='caregiver'||CAREGIVER_TOOLS.has(t.name)));}

export function validateToolArguments(def,args){
  if(!args||typeof args!=='object'||Array.isArray(args))throw authError('도구 인자를 확인해 주세요.');
  const check=(value,s,key)=>{
    if(s.type==='string'&&(typeof value!=='string'||value.length>(s.maxLength||500)))throw authError(`${key}: 올바른 문자열을 입력해 주세요.`);
    if(s.type==='number'||s.type==='integer')if(typeof value!=='number'||!Number.isFinite(value)||(s.type==='integer'&&!Number.isInteger(value))||(s.minimum!=null&&value<s.minimum)||(s.maximum!=null&&value>s.maximum))throw authError(`${key}: 숫자 범위를 확인해 주세요.`);
    if(s.type==='array'){if(!Array.isArray(value)||value.length<(s.minItems||0)||value.length>(s.maxItems||100))throw authError(`${key}: 항목을 확인해 주세요.`);value.forEach(x=>check(x,s.items,key));}
  };
  for(const key of def.parameters.required)if(args[key]===undefined||args[key]==='')throw authError(`${key} 값이 필요합니다.`);
  for(const [key,value] of Object.entries(args)){const s=Object.hasOwn(def.parameters.properties,key)?def.parameters.properties[key]:null;if(!s)throw authError(`지원하지 않는 인자입니다: ${key}`);check(value,s,key);}
  for(const key of ['from','to'])if(typeof args[key]==='string'){
    const date=new Date(args[key]+'T00:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(args[key])||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==args[key])throw authError('실제 날짜를 YYYY-MM-DD로 입력해 주세요.');
  }
  if(typeof args.from==='string'&&args.to&&args.from>args.to)throw authError('조회 시작일과 종료일을 확인해 주세요.');
  if(args.start&&!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/.test(args.start))throw authError('일시에 시간대(+09:00)를 포함해 주세요.');
  return args;
}
const paged=(items,args)=>({total:items.length,offset:args.offset||0,items:items.slice(args.offset||0,(args.offset||0)+(args.limit||50)),hasMore:(args.offset||0)+(args.limit||50)<items.length});
const exists=(rows,id)=>{const r=rows.find(r=>r.id===id);if(!r)throw authError('항목을 찾을 수 없거나 조회 권한이 없습니다.',404);return structuredClone(r);};
const matchesDate=(t,a)=>{if(!a.from&&!a.to)return true;if(!Number.isFinite(t))return false;const d=seoulDay(t);return (!a.from||d>=a.from)&&(!a.to||d<=a.to);};
function namesFor(state){return {elders:new Map(state.elders.map(e=>[e.id,e.name])),caregivers:new Map(state.caregivers.map(c=>[c.id,c.name]))};}
function requestRows(state,a,time='createdAt',names=a.query?namesFor(state):null){
 return state.requests.filter(r=>(!a.elderId||r.elderId===a.elderId)&&(!a.caregiverId||r.caregiverId===a.caregiverId)&&matchesDate(r[time],a)&&(!a.query||[r.transcript,r.service,names.elders.get(r.elderId),names.caregivers.get(r.caregiverId)].join(' ').includes(a.query))&&(!a.status||(a.status==='active'?['pending','confirmed'].includes(r.status):a.status==='unprocessed'?['pending','attention'].includes(r.status):a.status==='change_requested'?r.changeRequest?.status==='pending':r.status===a.status)));
}
const enrich=(r,names)=>({...r,elderName:names.elders.get(r.elderId),caregiverName:names.caregivers.get(r.caregiverId)});
function requestPage(state,args,time='createdAt'){
 const names=namesFor(state),rows=requestRows(state,args,time,names).filter(r=>time!=='start'||['pending','confirmed','completed'].includes(r.status)).sort(time==='start'?(a,b)=>a.start-b.start:(a,b)=>b.createdAt-a.createdAt);
 const page=paged(rows,args);return {...page,items:page.items.map(r=>enrich(r,names))};
}
function statistics(state,a){
 const rows=requestRows(state,a).filter(r=>!['draft','cancelled'].includes(r.status));
 const status=new Map(),service=new Map(),caregiver=new Map(),sourceRequestIds=[];let unprocessed=0,changeRequested=0;
 const increment=(map,key)=>map.set(key||'unassigned',(map.get(key||'unassigned')||0)+1);
 for(const r of rows){increment(status,r.status);increment(service,r.service);increment(caregiver,r.caregiverId);sourceRequestIds.push(r.id);if(['pending','attention'].includes(r.status))unprocessed++;if(r.changeRequest?.status==='pending')changeRequested++;}
 return {range:{from:a.from||null,to:a.to||null},total:rows.length,byStatus:Object.fromEntries(status),byService:Object.fromEntries(service),byCaregiver:Object.fromEntries(caregiver),unprocessed,changeRequested,sourceRequestIds};
}
export async function runReadTool({db,user,connections={},geocode,recordingInfo,now=Date.now()},name,args={}){
 const def=toolCatalog(user).find(t=>t.name===name&&!t.mutation);if(!def)throw authError('사용할 수 없는 조회 도구입니다.',403);validateToolArguments(def,args);
 const s=scopedState(db,user),ids=new Set(s.elders.map(e=>e.id));
 let items;
 switch(name){
 case 'list_requests':return requestPage(s,args);
 case 'get_request':return enrich(exists(s.requests,args.id),namesFor(s));
 case 'list_elders':{const related=new Set(s.requests.filter(r=>args.filter==='none'||(args.filter==='attention'?r.status==='attention':['pending','confirmed'].includes(r.status))).map(r=>r.elderId));items=s.elders.filter(e=>(!args.query||[e.name,e.address,e.contact].join(' ').includes(args.query))&&(!args.filter||(args.filter==='notes'?e.specialNotes||e.precautions:args.filter==='none'?!related.has(e.id):related.has(e.id))));return paged(items,args);}
 case 'get_elder':return exists(s.elders,args.id);
 case 'list_caregivers':return paged(s.caregivers.filter(c=>(!args.query||[c.name,c.address].join(' ').includes(args.query))&&(!args.service||c.services?.includes(args.service))),args);
 case 'get_caregiver':return exists(s.caregivers,args.id);
 case 'get_schedule':{const from=args.from||seoulDay(now),range={...args,from,to:args.to||seoulDay(Date.parse(from+'T00:00:00+09:00')+6*86400000)};if(range.to<range.from)throw authError('조회 시작일과 종료일을 확인해 주세요.');return {...requestPage(s,range,'start'),from:range.from,to:range.to};}
 case 'list_checkins':return paged(s.checkins.filter(c=>(!args.elderId||c.elderId===args.elderId)&&(!args.status||c.status===args.status)&&matchesDate(c.createdAt,args)),args);
 case 'list_attendance':return paged((db.attendance||[]).filter(c=>ids.has(c.elderId)&&(!args.elderId||c.elderId===args.elderId)&&matchesDate(c.firstAt,args)).sort((a,b)=>b.firstAt-a.firstAt),args);
 case 'get_wellness_settings':return s.wellnessSettings;
 case 'list_notifications':{const checkins=new Map(s.checkins.map(c=>[c.id,c.elderId]));const page=paged(db.wellnessOutbox.filter(j=>{const elderId=j.elderId||checkins.get(j.checkinId);return j.kind!=='sos'&&ids.has(elderId)&&(!args.elderId||elderId===args.elderId)&&(!args.status||j.status===args.status)&&matchesDate(j.createdAt,args);}),args);return {...page,items:page.items.map(({id,kind,checkinId,status,createdAt,finishedAt,error})=>({id,kind,checkinId,status,createdAt,finishedAt,error}))};}
 case 'list_devices':return paged(s.wellnessDevices,args);
 case 'list_approvals':return paged((db.accounts||[]).filter(a=>['social','caregiver'].includes(a.role)&&!a.disabled&&(!args.role||a.role===args.role)&&(!args.status||a.approvalStatus===args.status)).map(a=>({id:a.id,name:a.name,email:a.email,role:a.role,organizationId:organizationOf(a),status:a.approvalStatus,createdAt:a.createdAt,approvedAt:a.approvedAt,history:(db.accountApprovals||[]).filter(h=>h.userId===a.id)})),args);
 case 'list_organizations':return {organizations:(db.organizations||[]).filter(o=>user.role==='admin'||o.id===organizationOf(user)).map(o=>({...o,caregiverCount:s.caregivers.filter(c=>organizationOf(c)===o.id).length,elderCount:s.elders.filter(e=>organizationOf(e)===o.id).length}))};
 case 'get_account':return s.auth;
 case 'get_connections':return connections;
 case 'find_available_caregivers':{const r=exists(s.requests,args.id);return {caregivers:resolveCandidates(db,r,args,now).filter(c=>s.caregivers.some(x=>x.id===c.id))};}
 case 'get_recording':{const r=exists(s.requests,args.id);return {id:r.id,available:Boolean(r.voiceReview),playback:r.voiceReview?{path:'voice-recording',body:{id:r.id}}:null};}
 case 'get_statistics':return statistics(s,args);
 case 'get_report':{const result=statistics(s,args);return {...result,title:'돌봄 업무 보고서',generatedAt:now,text:`조회 기간 접수 ${result.total}건 · 미처리 ${result.unprocessed}건 · 완료 ${result.byStatus.completed||0}건 · 변경 요청 ${result.changeRequested}건`,caregivers:s.caregivers.map(c=>({id:c.id,name:c.name,count:result.byCaregiver[c.id]||0}))};}
 case 'search_address':if(!geocode)throw authError('주소 검색 연결을 확인해 주세요.',503);return {address:args.address,...await geocode(args.address)};
 default:throw authError('지원하지 않는 조회입니다.');
 }
}
