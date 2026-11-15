import { scopedState } from './auth.mjs';
import { seoulDay } from './scheduler.mjs';

const DAY=86400000;
export function dateFilters(text,now){
 const explicit=text.match(/\d{4}-\d{2}-\d{2}/g);
 if(explicit?.length)return explicit.length<=2&&!/오늘|어제|내일|모레|이번|지난|다음|비교|각각|제외/.test(text)?{from:explicit[0],to:explicit.at(-1)}:null;
 const periods=text.match(/오늘|어제|모레|내일|(?:이번|지난|다음)\s*(?:주|달|개월)|이번\s*달/g)||[];
 if(periods.length>1||/비교|각각/.test(text))return null;
 const day=seoulDay(now),start=Date.parse(day+'T00:00:00+09:00');
 if(/오늘|어제|모레|내일/.test(text)){const offset=/어제/.test(text)?-1:/모레/.test(text)?2:/내일/.test(text)?1:0;return {from:seoulDay(start+offset*DAY),to:seoulDay(start+offset*DAY)};}
 if(/(?:이번|지난|다음)\s*주/.test(text)){const weekday=new Date(start+32400000).getUTCDay(),offset=/지난\s*주/.test(text)?-7:/다음\s*주/.test(text)?7:0,first=start+(offset-(weekday+6)%7)*DAY;return {from:seoulDay(first),to:seoulDay(first+6*DAY)};}
 if(/(?:이번|지난|다음)\s*달/.test(text)){const [y,m]=day.split('-').map(Number),offset=/지난\s*달/.test(text)?-1:/다음\s*달/.test(text)?1:0;return {from:new Date(Date.UTC(y,m-1+offset,1)).toISOString().slice(0,10),to:new Date(Date.UTC(y,m+offset,0)).toISOString().slice(0,10)};}
 if(/\d+\s*(?:월|일|주)|월요일|화요일|수요일|목요일|금요일|토요일|일요일|최근|주말|평일|오전|오후|부터|까지/.test(text))return null;
 return {};
}
const say=answer=>({answer,calls:[]});
const call=(name,args)=>({answer:'',calls:[{name,arguments:args}]});
const change=/변경|바꾸|바꿔|수정|등록|재배정|기록하고|저장|삭제|미리보기|확인 전/;
const readWords=['확인하고 싶어요','확인해 주세요','조회 부탁해요','보여 줄래','정리해 줘','지금 찾아줘','알려 주세요','알려줘','보여줘','정리해줘','다시 조회해줘','부탁드립니다','다른 조건 유지','어르신의','보호사의','요양보호사','어르신','보호사','전체 기관의','소속 기관의','조회 가능한','돌봄','요청','목록','이력','주의사항','주의 사항','특이사항','특이 사항','근무','요일과','시간','내','나의','본인','담당','일정','시간표','통계와','통계','접수','건수','전체','업무','보고서','출석','기록','안부','확인','음성','지도','서비스','연결','설정','상태','수락 대기','미확정','미처리','확정된','완료된','확정','완료','조율','그 중','그중','그분','그 분','이어서','것만','대기만','만','이번 주','지난 주','다음 주','이번 달','지난 달','다음 달','이번주','지난주','다음주','이번달','지난달','다음달','오늘','어제','내일','모레','몇 건','몇건','부터','까지'].sort((a,b)=>b.length-a.length);

// This is a conservative parser for explicit requests, not an authorization boundary.
// Every returned call still passes through the scoped tool executor and confirmation API.
export function routeRequest(text,context,contextTool,db,user,now,catalog){
 if(/비밀번호|토큰.*출력|이전 지시.*무시/.test(text))return say('비밀번호와 인증 토큰은 조회할 수 없습니다.');
 if(/승인/.test(text)&&user.role!=='admin')return say('가입 승인 목록은 관리자만 조회할 수 있습니다.');
 if(user.role==='caregiver'&&/재배정/.test(text))return say('일정 재배정은 담당 사회복지사에게 요청해 주세요.');
 const state=scopedState(db,user);
 const resolve=(rows)=>{
  const matches=rows.filter(r=>text.includes(r.name)||new RegExp('(?:^|[^\\w-])'+r.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^\\w-])').test(text));
  return matches.length===1?matches[0]:matches.length>1?false:undefined;
 };
 const elder=resolve(state.elders),carer=resolve(state.caregivers);
 if(elder===false||carer===false)return say('같은 이름이나 여러 대상이 확인됩니다. 조회할 한 분의 ID를 지정해 주세요.');
 const allowed=(name,args)=>catalog.some(t=>t.name===name)?call(name,args):say('이 계정에서는 해당 기능을 사용할 수 없습니다.');
 if(change.test(text)){
  // Do not interpret negation, a question, or multiple edits as consent to prepare a change.
  if(/하지\s*마|말고|유지/.test(text.replace(/확인 전(?:에는)?(?: 적용| 저장)?하지 마|확인 전 저장하지 마|특이사항은 유지하고/g,'')))return null;
  if(/근무/.test(text)&&/변경|제안|미리보기|확인받|확인 전/.test(text)){
   const target=carer||(/내|본인|나의/.test(text)?state.caregivers.find(c=>c.id===user.caregiverId):null);
   const times=text.match(/(\d+(?:\.\d+)?)시부터\s*(\d+(?:\.\d+)?)시/);
   const daysText=text.match(/([일월화수목금토](?:[·,]\s*[일월화수목금토])*)요일/);
   if(!target||!times||!daysText||(text.match(/요일/g)||[]).length!==1||/추가|제외|빼고|다만|대신|말고|그리고|변경하고/.test(text)||/오전|오후|주말|평일|~|부터.*요일/.test(text.slice(0,text.indexOf(times[0]))))return null;
   return allowed('propose_work_hours',{id:target.id,days:[...new Set(daysText[1].replace(/[·,\s]/g,'').split('').map(d=>'일월화수목금토'.indexOf(d)))],from:Number(times[1]),to:Number(times[2])});
  }
  const note=text.match(/(?:주의사항|특이사항)을\s*["“]([^"”]*)["”](?:로|으로)/);
  if(elder&&note&&/변경안/.test(text)&&!/주의사항.*특이사항.*(?:바꾸|변경)/.test(text))return allowed('propose_elder_notes',{id:elder.id,[note[0].startsWith('주의')?'precautions':'specialNotes']:note[1]});
  const contact=text.match(/연락 결과를\s*["“]([^"”]+)["”](?:으로|로)/);
  const checkins=state.checkins.filter(c=>text.includes(c.id));
  if(contact&&checkins.length===1&&/실제.*통화했|직접.*연락했/.test(text)&&/완료.*변경안/.test(text))return allowed('propose_checkin_resolution',{id:checkins[0].id,note:contact[1]});
  return null;
 }
 const dates=dateFilters(text,now);if(!dates)return null;
 if((text.match(/미처리|미확정|수락\s*대기|확정|완료|조율/g)||[]).length>1)return null;
 if(/제외|빼고|비교|각각|이상|이하|취소|아닌|말고|검색|주소|\bID\b|상세내용/.test(text))return null;
 // Accept terminal question/report forms without dropping unknown constraints.
 let rest=text.replace(/(?:이야|인가요|인지 알려줘|만들어줘)[?!.\s]*$/,'');
 for(const row of [elder,carer].filter(Boolean))rest=rest.replaceAll(row.name,'').replaceAll(row.id,'');
 rest=rest.replace(/\d{4}-\d{2}-\d{2}/g,'');
 for(const word of readWords)rest=rest.replaceAll(word,'');
 // Unrecognized constraints belong to the model, never silently drop them.
 if(rest.replace(/[\s.,?!·()~～-]/g,''))return null;
 const follow=/그\s*중|그\s*분|이어서/.test(text);
 let args={...(follow?context:{}),...dates};
 if(elder)args.elderId=elder.id;
 if(carer)args.caregiverId=carer.id;
 if(/미처리|처리 안|아직 처리/.test(text))args.status='unprocessed';
 else if(/미확정|수락 대기/.test(text))args.status='pending';
 else if(/확정/.test(text))args.status='confirmed';
 else if(/완료/.test(text))args.status='completed';
 else if(/조율/.test(text))args.status='attention';
 let name;
 if(follow&&!/요청|일정|시간표|출석|안부/.test(text))name=contextTool;
 else name=/보고서/.test(text)?'get_report':/통계|건수|몇\s*건/.test(text)?'get_statistics':/일정|시간표/.test(text)?'get_schedule':/출석/.test(text)?'list_attendance':/안부/.test(text)?'list_checkins':/연결.*(?:설정|상태)|설정 상태/.test(text)?'get_connections':/주의\s*사항|특이\s*사항/.test(text)?'get_elder':/근무|보호사.*목록/.test(text)?'list_caregivers':/어르신.*목록/.test(text)?'list_elders':/요청/.test(text)?'list_requests':undefined;
 if(!name)return null;
 // Unknown named subjects must never turn into an unfiltered list.
 if(/어르신(?:의)?\s*(?:주의|특이|요청)/.test(text)&&!elder)return null;
 if(name==='get_elder'){if(!elder)return null;args={id:elder.id};}
 if(name==='list_caregivers'&&carer)args={query:carer.name};
 const def=catalog.find(t=>t.name===name);if(!def)return say('이 계정에서는 해당 조회를 사용할 수 없습니다.');
 if(def.mutation)return say('변경하려는 내용을 새로 말씀해 주세요. 이전 변경안을 조회 질문으로 다시 만들지는 않습니다.');
 const unsupported=Object.keys(args).filter(k=>!(k in def.parameters.properties));
 if(unsupported.length&&!(name==='list_caregivers'&&carer))return null;
 return allowed(name,args);
}

export function normalizeModelArguments(call,catalog,{message='',now=Date.now()}={}){
 const def=catalog.find(t=>t.name===call.name);if(!def)return;
 // Optional null means omitted, but required null and unknown keys remain invalid.
 call.arguments=Object.fromEntries(Object.entries(call.arguments||{}).filter(([k,v])=>!(v===null&&Object.hasOwn(def.parameters.properties,k)&&!def.parameters.required.includes(k))));
 if(!def.mutation&&def.parameters.properties.from?.type==='string'){
  const dates=dateFilters(message,now);
  if(dates&&Object.keys(dates).length&&!/제외|말고|각각|비교|주간?별|일별|월별|날짜별/.test(message))Object.assign(call.arguments,dates);
 }
 const statuses=message.match(/미처리|미확정|수락\s*대기|확정|완료|조율/g)||[];
 if(['list_requests','get_schedule'].includes(call.name)&&statuses.length<=1&&!/제외|빼고|말고|아닌|각각|비교|또는/.test(message)){
  if(/미처리|아직\s*처리(?:가)?\s*(?:안\s*된|되지)|처리\s*(?:가\s*)?안\s*된/.test(message))call.arguments.status='unprocessed';
  else if(/미확정|수락\s*대기/.test(message))call.arguments.status='pending';
 }
}
