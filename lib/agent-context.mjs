// Keep model inputs bounded without cutting serialized JSON in the middle of a field.
// The UI still receives the full tool result; only the model's copy is shortened.
export function toolMessage(name,result,maxChars=8000){
 let shortened=false;
 const trim=(value,limit,depth=0)=>{
  if(typeof value==='string'&&value.length>limit*40){shortened=true;return value.slice(0,limit*40)+'…';}
  if(!value||typeof value!=='object')return value;
  if(depth>6){shortened=true;return '[상세 내용 생략]';}
  if(Array.isArray(value)){if(value.length>limit)shortened=true;return value.slice(0,limit).map(v=>trim(v,limit,depth+1));}
  const entries=Object.entries(value);if(entries.length>limit*2)shortened=true;
  return Object.fromEntries(entries.slice(0,limit*2).map(([k,v])=>[k,trim(v,limit,depth+1)]));
 };
 for(const limit of [30,15,5,1]){
  shortened=false;const copy=trim(result,limit);
  if(Array.isArray(result.items)&&copy.items&&copy.items.length<result.items.length){copy.hasMore=true;copy.nextOffset=(result.offset||0)+copy.items.length;}
  const content=JSON.stringify({name,result:copy,...(shortened?{truncated:true,notice:'긴 내용과 목록 일부를 생략했습니다. 전체 건수는 total이며 필요한 상세·다음 페이지를 별도 조회하세요.'}:{})});
  if(content.length<=maxChars)return content;
 }
 return JSON.stringify({name,result:{total:result.total},truncated:true,notice:'결과가 너무 큽니다. 대상 또는 조회 기간을 좁혀 다시 조회하세요.'});
}

export function boundedMessages(messages,budget=16000,question){
 const anchor=question?messages.indexOf(question):-1,kept=new Set(anchor>0?[anchor]:[]);let used=anchor>0?question.content.length:0;
 for(let i=messages.length-1;i>0;i--){if(i===anchor)continue;const size=messages[i].content.length;if(used+size>budget)break;kept.add(i);used+=size;}
 return [messages[0],...[...kept].sort((a,b)=>a-b).map(i=>messages[i])];
}
