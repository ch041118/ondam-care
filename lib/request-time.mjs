const DAY=86400000,HOUR=3600000,MINUTE=60000;
const hours={'한':1,'두':2,'세':3,'네':4,'다섯':5,'여섯':6,'일곱':7,'여덟':8,'아홉':9,'열':10,'열한':11,'열두':12};
const hourWord='(?:열두|열한|여덟|아홉|일곱|여섯|다섯|한|두|세|네|열|\\d+)';
const minuteWord='(?:\\d+|[일이삼사오육칠팔구십]+)';
const dayOf=time=>new Date(time+9*HOUR).toISOString().slice(0,10);
const number=value=>Object.hasOwn(hours,value)?hours[value]:Number(value);
function minuteNumber(value){
 if(!value)return 0;if(/^\d+$/.test(value))return Number(value);
 const digits={'일':1,'이':2,'삼':3,'사':4,'오':5,'육':6,'칠':7,'팔':8,'구':9};
 if(!/^(?:[일이삼사오육칠팔구]?십[일이삼사오육칠팔구]?|[일이삼사오육칠팔구])$/.test(value))return NaN;
 if(value.includes('십')){const [t,u]=value.split('십');return (t?digits[t]:1)*10+(u?digits[u]:0);}
 return digits[value];
}

// Use the time of transcription, always in Seoul. An appointment clock time
// must never become a duration, or be replaced by the model's invented time.
export function parseRequestTime(text,now=Date.now()){
 const raw=String(text),s=raw.replace(/\s+/g,'');
 const review=(label,reason='희망 날짜나 오전·오후를 확인해 주세요.')=>({kind:'review',requestedAt:null,label,reason});
 if(/어제|그제|지난|열세|열네|열다섯|열여섯|열일곱|열여덟|열아홉|[-−]\d+(?:시|분)|\d+\.\d+(?:시|분)/.test(s))return review(raw);
 if(/스물|서른|다음주|이번주|요일|주말/.test(s))return review(raw);
 if(/(?:시|분|정오|자정|오늘|내일|모레)(?:반|쯤|정도)?(?:에)?(?:말고|아니고|까지|부터|이후|이전|전|후)/.test(s)&&!/(?:시간|분)(?:후|뒤)/.test(s))return review(raw,'시간 범위나 변경 조건을 담당자가 확인해야 합니다.');
 const dates=[...s.matchAll(/내일모레|오늘|내일|모레|글피/g)];
 const explicit=[...s.matchAll(/(?:(\d{4})년)?(\d{1,2})월(\d{1,2})일/g)];
 let day=null;
 if(dates.length+explicit.length>1)return review(raw,'여러 날짜가 언급되어 희망 시간을 확인해야 합니다.');
 if(dates.length){const offsets={'오늘':0,'내일':1,'모레':2,'내일모레':2,'글피':3};day=dayOf(now+offsets[dates[0][0]]*DAY);}
 if(explicit.length){const [,year,month,date]=explicit[0];const y=year||dayOf(now).slice(0,4);day=`${y}-${month.padStart(2,'0')}-${date.padStart(2,'0')}`;const stamp=Date.parse(day+'T00:00:00+09:00');if(!Number.isFinite(stamp)||dayOf(stamp)!==day)return review(raw,'존재하지 않는 날짜입니다. 날짜를 확인해 주세요.');}
 const relative=[...s.matchAll(new RegExp(`(?<![0-9영공일이삼사오육칠팔구십백천만])(?:(${hourWord})시간(?:(${minuteWord})분|(반))?|(${minuteWord})분)(?:후|뒤)`,'g'))];
 const clock=[...s.matchAll(new RegExp(`(${hourWord})시(?!간)(?:(${minuteWord})분|(반))?`,'g'))];
 const colon=[...s.matchAll(/(?<!\d)(\d+):(\d+)(?!\d)/g)];
 const noon=[...s.matchAll(/정오/g)];
 if(clock.length+colon.length+noon.length>1||relative.length>1)return review(raw,'여러 시각이 언급되어 희망 시간을 확인해야 합니다.');
 if(relative.length){
  if(day||clock.length||colon.length||noon.length||/말고|아니고|까지|이전|이후/.test(s))return review(raw);
  const r=relative[0];
  if(/시간|분(?:후|뒤)/.test(s.slice(0,r.index)+s.slice(r.index+r[0].length)))return review(raw);
  const minutes=r[1]?number(r[1])*60+(r[3]?30:minuteNumber(r[2])):minuteNumber(r[4]);
  if(!(minutes>0&&minutes<=24*60))return review(raw);
  const requestedAt=Math.ceil(now/MINUTE)*MINUTE+minutes*MINUTE;
  return {kind:'resolved',requestedAt,label:raw};
 }
 const match=clock[0]||colon[0]||(noon.length?['정오','12','00']:null);
 if(!match){
  if(day||/시간|분후|분뒤|일뒤|일후|오전|오후|아침|저녁|새벽|정오|자정|다음주|이번주|요일|주말|[월화수목금토일]요일|점심|쯤|무렵|이따|나중/.test(s))return review(raw);
  return {kind:'none',requestedAt:null,label:''};
 }
 let hour=number(match[1]),minute=clock.length?(match[3]?30:minuteNumber(match[2])):Number(match[2]);
 if(!Number.isInteger(hour)||hour>23||!Number.isInteger(minute)||minute<0||minute>59)return review(raw,'시각을 다시 확인해 주세요.');
 const periods=[...s.matchAll(/오전|오후|아침|저녁|새벽|낮|밤/g)].map(m=>m[0]);
 if(periods.length>1)return review(raw);
 const period=periods[0];
 if(period){
  if((period==='밤'&&(hour<=5||hour===12))||(['아침','새벽'].includes(period)&&hour===12)||hour===0)return review(raw,'날짜 경계와 오전·오후를 확인해 주세요.');
  if(hour>12){if(period!=='오후')return review(raw,'오전·오후와 시각이 일치하는지 확인해 주세요.');}
  else if(['오전','아침','새벽'].includes(period))hour%=12;
  else hour=hour%12+12;
 }else if(!colon.length&&!noon.length&&hour>=1&&hour<=12){
  return review(`${day||'날짜 확인 필요'} ${hour}시${minute?' '+minute+'분':''}${/쯤|정도|무렵/.test(s)?'쯤':''} · 오전/오후 확인 필요`,'말씀하신 시각의 오전·오후를 확인해 주세요.');
 }
 if(!day)return review(raw,'희망 날짜를 확인해 주세요.');
 const requestedAt=Date.parse(`${day}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00+09:00`);
 if(requestedAt<=now)return review(raw,'말씀하신 시간이 지나 희망 날짜와 시각을 확인해야 합니다.');
 return {kind:'resolved',requestedAt,label:`${day} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}${/쯤|정도|무렵/.test(s)?'쯤':''}`};
}

export function applyRequestTime(intent,text,now){
 const time=parseRequestTime(text,now);
 return {...intent,requestedAt:time.requestedAt,needsReview:intent.needsReview||time.kind==='review',requestedTimeText:time.label,timeNeedsReview:time.kind==='review',timeReviewReason:time.reason||''};
}
