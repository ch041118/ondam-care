// Conservative checks supplement the local model. A review never becomes an
// automatic booking just because the model selected a valid service label.
export function applyRequestReview(intent,text){
 const raw=String(text).replace(/\s+/g,'');
 let reason='';
 if(/약.*(?:몇알|얼마나|늘려|끊어|먹어도)|진단|처방|법률.*(?:판단|상담)|소송.*(?:이길|승소)|(?:주식|코인).*(?:사도|사야|추천)|(?:규칙|지시).*(?:무시|잊어)/.test(raw))reason='의료·법률·투자 판단 또는 처리 규칙 변경 요청은 자동 수행하지 않습니다. 담당자가 확인해야 합니다.';
 if(/주사|수액|처치|투약|욕창|호흡곤란|숨(?:이|을)?(?:안|못)|숨쉬(?:기|기가)?(?:힘|어려)|가슴(?:이)?(?:아프|통증)|의식(?:이)?없|쓰러|넘어졌|출혈/.test(raw))reason='지원하는 일상 돌봄 범위를 벗어나 담당자가 내용을 확인해야 합니다.';
 else if(/예약|시간바꾸면안|늦으면안|변경불가/.test(raw))reason='예약 또는 변경하기 어려운 시간이 언급되어 담당자가 확인해야 합니다.';
 // Remove only explicit opt-outs; uncertain negations are reviewed below.
 const s=raw.replace(/(?:청소|장보기|빨래|설거지|병원|산책|밥|식사)(?:은|는|도)?(?:안해도(?:되고|돼|됩니다)|하지마(?:세요)?|말고)/g,'');
 const found=[
  ['생활 도움',/청소|장보|장좀봐|빨래|세탁|설거지/],
  ['병원 동행',/병원|진료|검사받/],
  ['식사 도움',/밥|식사|반찬|죽(?:좀|을|만|차려|만들)/],
  ['외출 동행',/산책|외출|공원/]
 ].filter(([,re])=>re.test(s)).map(([service])=>service);
 if(!reason){
  if(found.length>1)reason='여러 종류의 도움이 함께 요청되어 각각의 내용을 확인해야 합니다.';
  else if(!found.length||/모르겠|안해|하지마|싫어|필요없|말고|아니고/.test(s))reason='필요한 돌봄 종류가 명확하지 않아 담당자가 확인해야 합니다.';
 }
 return {...intent,service:found.length===1?found[0]:intent.service,needsReview:intent.needsReview||Boolean(reason),requestReviewReason:reason};
}
