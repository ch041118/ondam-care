export function apiHeaders(extra={}) {
 return {...extra,Accept:'application/json','ngrok-skip-browser-warning':'1'};
}

export function parseApiBody(text,status=200,contentType='') {
 const failure=(message,code)=>Object.assign(Error(message),{status,code});
 if(/^\s*</.test(text)||/text\/html/i.test(contentType)){
  if(/ERR_NGROK_6024|ngrok.*(?:interstitial|data-payload)/is.test(text))
   throw failure('서버 접속 안내 화면이 반환됐어요. 앱을 새로 연 뒤 다시 확인해 주세요.','TUNNEL_NOTICE');
  throw failure('서버 연결이 끊겨 안내 페이지가 반환됐어요. 요청이 접수됐는지 확인한 뒤 다시 시도해 주세요.','HTML_RESPONSE');
 }
 let value;
 try{value=JSON.parse(text);}catch{throw failure('서버 응답을 읽지 못했어요. 요청이 접수됐는지 확인한 뒤 다시 시도해 주세요.','INVALID_JSON');}
 if(!value||typeof value!=='object'||Array.isArray(value))throw failure('서버 응답 형식이 올바르지 않아요. 앱을 다시 열어 주세요.','INVALID_RESPONSE');
 return value;
}

export async function readApiResponse(response){
 return parseApiBody(await response.text(),response.status,response.headers.get('content-type')||'');
}

export async function voicePayload(blob,elderId,checkinId){
 const mimeType=blob.type.split(';')[0].trim().toLowerCase();
 if(!['audio/mp4','audio/aac','audio/webm'].includes(mimeType))throw Error('이 브라우저의 녹음 형식을 지원하지 않아요. Safari 또는 Chrome에서 다시 열어 주세요.');
 if(blob.size>7*1024*1024)throw Error('녹음이 너무 길어요. 짧게 다시 말씀해 주세요.');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 let binary='';
 for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 return {elderId,checkinId,attemptId:crypto.randomUUID(),audioBase64:btoa(binary),mimeType};
}
