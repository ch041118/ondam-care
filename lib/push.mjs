import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';
import { connect } from 'node:http2';
let oauth;
const b64 = object => Buffer.from(JSON.stringify(object)).toString('base64url');
function jwt(header,payload,key,algorithm){const content=`${b64(header)}.${b64(payload)}`;const signature=sign(algorithm,Buffer.from(content),{key:createPrivateKey(key),dsaEncoding:'ieee-p1363'}).toString('base64url');return `${content}.${signature}`;}
export function pushConfiguration(){return {android:Boolean(process.env.FCM_SERVICE_ACCOUNT_FILE),ios:Boolean(process.env.APNS_KEY_FILE&&process.env.APNS_KEY_ID&&process.env.APNS_TEAM_ID&&process.env.APNS_TOPIC)};}
async function sendAndroid(token,job){
  if(!process.env.FCM_SERVICE_ACCOUNT_FILE)throw Error('Android 푸시 서버 설정이 없습니다.');
  const account=JSON.parse(readFileSync(process.env.FCM_SERVICE_ACCOUNT_FILE,'utf8'));
  if(!oauth||oauth.until<Date.now()){
    const now=Math.floor(Date.now()/1000);
    const assertion=jwt({alg:'RS256',typ:'JWT'},{iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},account.private_key,'RSA-SHA256');
    const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Android 푸시 인증에 실패했습니다.');
    const data=await response.json();if(!data.access_token)throw Error('Android 푸시 인증 응답을 확인해 주세요.');oauth={token:data.access_token,until:Date.now()+Math.max(60,(data.expires_in||3600)-120)*1000};
  }
  const response=await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,{method:'POST',headers:{Authorization:`Bearer ${oauth.token}`,'Content-Type':'application/json'},body:JSON.stringify({message:{token,notification:{title:job.title,body:job.body},data:{kind:job.kind,checkinId:job.checkinId},android:{priority:'high',ttl:job.kind==='reminder'?'300s':'86400s',collapse_key:job.checkinId,notification:{channel_id:'clover-wellness',tag:job.checkinId,sound:'default'}}}}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Android 푸시 발송을 확인하지 못했습니다. (HTTP ${response.status})`);
}
async function sendIos(token,job){
  if(!pushConfiguration().ios)throw Error('iPhone 푸시 서버 설정이 없습니다.');
  const bearer=jwt({alg:'ES256',kid:process.env.APNS_KEY_ID},{iss:process.env.APNS_TEAM_ID,iat:Math.floor(Date.now()/1000)},readFileSync(process.env.APNS_KEY_FILE,'utf8'),'sha256');
  const host=process.env.APNS_ENVIRONMENT==='production'?'https://api.push.apple.com':'https://api.sandbox.push.apple.com';
  const body=JSON.stringify({aps:{alert:{title:job.title,body:job.body},sound:'default','thread-id':'clover-wellness'},kind:job.kind,checkinId:job.checkinId});
  await new Promise((resolve,reject)=>{
    const client=connect(host);let finished=false;
    const done=error=>{if(finished)return;finished=true;clearTimeout(timer);client.close();error?reject(error):resolve();};
    const timer=setTimeout(()=>{client.destroy();done(Error('iPhone 푸시 서버 응답 시간이 초과됐습니다.'));},15000);
    client.on('error',()=>done(Error('iPhone 푸시 서버 연결에 실패했습니다.')));
    const request=client.request({':method':'POST',':path':`/3/device/${token}`,authorization:`bearer ${bearer}`,'apns-topic':process.env.APNS_TOPIC,'apns-push-type':'alert','apns-priority':'10','apns-expiration':String(Math.floor(job.expiresAt/1000)),'apns-collapse-id':job.checkinId.slice(0,64)});
    let status;
    request.on('response',headers=>{status=headers[':status'];});request.on('data',()=>{});
    request.on('end',()=>done(status===200?null:Error(`iPhone 푸시 발송을 확인하지 못했습니다. (HTTP ${status})`)));
    request.on('error',()=>done(Error('iPhone 푸시 요청이 중단됐습니다.')));request.end(body);
  });
}
export async function sendPushJob(job,devices){
  if(!devices.length)return {ok:false,error:'알림을 받을 수 있는 등록 기기가 없습니다.'};
  const results=await Promise.allSettled(devices.map(device=>device.platform==='android'?sendAndroid(device.token,job):sendIos(device.token,job)));
  if(results.some(r=>r.status==='fulfilled'))return {ok:true};
  return {ok:false,error:results[0].reason.message};
}
