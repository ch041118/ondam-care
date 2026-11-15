import {brandImage} from './lib/brand-image.mjs';
import {saveElderNotes} from './lib/elder-notes.mjs';
import {registrationConsent} from './lib/consent.mjs';
import {resolveCandidates} from './lib/scheduler.mjs';
import {createAgentService,agentConfiguration} from './lib/agent.mjs';
import {createRequestDraft,requestFeedback} from './lib/request-feedback.mjs';
import {organizationOf,retireEmergencyFeatures} from './lib/organization.mjs';
import { createVoiceFallback } from './lib/voice-fallback.mjs';
import { serverConfig,clientAddress } from './lib/server-config.mjs';
import { createHostedCache,acceptsGzip } from './lib/hosted-cache.mjs';
import { lockDataDirectory } from './lib/data-lock.mjs';
import { ensureAuth,createAuthService,findSession,authorize,scopedState,authError } from './lib/auth.mjs';
import { validateHours } from './lib/caregivers.mjs';
import { updateCaregiverProfile } from './lib/caregiver-update.mjs';
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './lib/seed.mjs';
import { SERVICES, match, event, transition } from './lib/scheduler.mjs';
import { decodeNativeAudio } from './lib/voice-input.mjs';
import { ensureWellness, wellnessCommand, publicWellnessState, replyCheckin, classifyWellnessReply, markElderActivity, markElderRequest } from './lib/wellness.mjs';
import { createWellnessWorker } from './lib/wellness-worker.mjs';
import { sendPushJob, pushConfiguration } from './lib/push.mjs';
import { interpret, geocode, transcribe } from './lib/integrations.mjs';
const root = dirname(fileURLToPath(import.meta.url));
const getHostedPage=createHostedCache(resolve(root,'public'));
const config=serverConfig();
const dataDir = resolve(process.env.CLOVER_DATA_DIR || resolve(root, 'data')); mkdirSync(dataDir, {recursive:true});
lockDataDirectory(dataDir);
process.once('SIGINT',()=>process.exit(0));process.once('SIGTERM',()=>process.exit(0));
const file = resolve(dataDir, 'state.json');
let db = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : config.production?{caregivers:[],elders:[],requests:[]}:seed();
ensureWellness(db); ensureAuth(db);retireEmergencyFeatures(db);
const save = (next=db) => { writeFileSync(file + '.tmp', JSON.stringify(next, null, 2),{mode:0o600}); renameSync(file + '.tmp', file); };
save();
const {port,host,origins:allowedOrigins,hosts:allowedHosts}=config;
async function caregiverGeocode(address){if(!process.env.NAVER_CLIENT_ID||!process.env.NAVER_CLIENT_SECRET)return {lat:null,lng:null,locationVerified:false};return geocode(address);}
const commit=fn=>{const next=structuredClone(db),result=fn(next);save(next);db=next;return result;};
const auth=createAuthService({getDb:()=>db,geocode:caregiverGeocode,commit});
const connectionState=()=>({wellnessPush:pushConfiguration(),checkinVoice:Boolean(process.env.STT_URL),voice:Boolean(process.env.STT_URL&&process.env.OLLAMA_MODEL),maps:Boolean(process.env.NAVER_CLIENT_ID&&process.env.NAVER_CLIENT_SECRET),agent:agentConfiguration()});
const currentAgentUser=user=>{const session=db.sessions.find(s=>s.hash===user.sessionHash&&s.expiresAt>Date.now()),account=session&&db.accounts.find(a=>a.id===session.userId&&!a.disabled);if(!account||!['admin','social','caregiver'].includes(session.role)||account.role!==session.role||['social','caregiver'].includes(account.role)&&account.approvalStatus!=='approved')return null;return {...user,...account,role:session.role,sessionHash:session.hash};};
const agent=createAgentService({getDb:()=>db,commit,getUser:currentAgentUser,connections:connectionState,geocode});

function tokenFrom(req){if(req.headers.authorization)return req.headers.authorization.startsWith('Bearer ')?req.headers.authorization.slice(7):'';return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('clover_session='))?.slice(15)||'';}

function addRequest(body, demo = false) {
 return commit(db=>{
  if (!db.elders.some(e => e.id === body.elderId) || !SERVICES.includes(body.service)) throw Error('어르신과 돌봄 종류를 확인해 주세요.');
  if (body.requestedAt !== null && (!Number.isFinite(body.requestedAt) || body.requestedAt < Date.now())) throw Error('앞으로의 날짜와 시간을 선택해 주세요.');
  if (db.requests.some(r => r.elderId === body.elderId && r.service === body.service && r.status !== 'completed' && Date.now() - r.createdAt < 60000)) throw Error('방금 같은 요청을 접수했어요. 잠시 기다려 주세요.');
  const request = {id:randomUUID(), organizationId:organizationOf(db.elders.find(e=>e.id===body.elderId)),elderId:body.elderId, service:body.service, requestedAt:body.requestedAt, requestedTimeText:String(body.requestedTimeText||'').slice(0,4000), timeNeedsReview:body.timeNeedsReview===true, duration:60, transcript:String(body.transcript || body.service).slice(0,4000), demo, createdAt:Date.now(), status:'pending', events:[]};
  event(request, '어르신', '돌봄 요청을 접수했습니다.');
  const assignment = body.needsReview ? null : match(db, request);
  if (assignment) { Object.assign(request, assignment); event(request, '자동 배정', `${db.caregivers.find(c=>c.id===request.caregiverId).name} 보호사에게 ${new Date(request.start).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} 신청했습니다. (주변 5km·가장 빠른 가능 일정)`); }
  else {request.status='attention'; request.reason=body.needsReview ? String(body.requestReviewReason||body.timeReviewReason||'요청 내용이나 시간의 확인이 필요합니다.').slice(0,400) : '7일 안에 가능한 주변 보호사가 없습니다.'; event(request, '시스템', request.reason);}
  db.requests.unshift(request); if(!demo)markElderRequest(db,body.elderId); return request;
 });
}
const voiceFallback=createVoiceFallback({getDb:()=>db,save,dataDir,onFallback:request=>{markElderRequest(db,request.elderId);if(request.voiceReview.checkinId&&db.checkins.some(c=>c.id===request.voiceReview.checkinId&&!c.respondedAt&&!c.resolvedAt&&['waiting','escalated','delivery_failed'].includes(c.status)))replyCheckin(db,{id:request.voiceReview.checkinId,elderId:request.elderId,text:'말씀을 3회 인식하지 못해 녹음 확인 요청을 남겼습니다.',outcome:'review'});}});
async function processVoice(audio,mime,elderId,checkinId,attemptId){return voiceFallback.process({audio,mime,elderId,checkinId,attemptId,run:async()=>{if(checkinId){const text=await transcribe(audio,mime);const checkin=commit(next=>replyCheckin(next,{id:checkinId,elderId,text,outcome:classifyWellnessReply(text)}));return {checkin};}const intent=await interpret(audio,mime);return commit(next=>createRequestDraft(next,{...intent,elderId}));}});}
const staticFiles = {'/agent-ui.js':'agent-ui.js','/timetable.js':'timetable.js','/feedback-ui.js':'feedback-ui.js','/splash.js':'splash.js','/brand-art.js':'brand-art.js','/privacy.js':'privacy.js','/elder-directory.js':'elder-directory.js','/resolve-picker.js':'resolve-picker.js','/elder-help.js':'elder-help.js','/request-view.js':'request-view.js','/overview-data.js':'overview-data.js','/theme.js':'theme.js','/browser-handoff.js':'browser-handoff.js','/http-response.js':'http-response.js','/mic-input.js':'mic-input.js','/web-app.js':'web-app.js','/boot-status.js':'boot-status.js','/':'index.html','/app/':'hosted.html','/hosted.js':'hosted.js','/native-bridge.js':'native-bridge.js','/hold-recorder.js':'../mobile/core.mjs','/app.js':'app.js','/style.css':'style.css','/wellness-ui.js':'wellness-ui.js','/caregiver-fields.js':'caregiver-fields.js','/auth-ui.js':'auth-ui.js','/mobile/':'../dist/index.html','/mobile/app.js':'../dist/app.js','/mobile/style.css':'../dist/style.css'};
const server = http.createServer(async (req,res) => {
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Permissions-Policy','microphone=(self), camera=(), geolocation=()');
  if(config.production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const reply = (status, body) => {res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body));};
  try {
    const host = req.headers.host;
    if (!allowedHosts.includes(host)) return reply(403,{error:'허용되지 않은 접속 주소입니다.'});
    if (req.headers.origin && !allowedOrigins.includes(req.headers.origin)) return reply(403,{error:'허용되지 않은 요청입니다.'});
    if(req.method==='POST'&&req.headers['sec-fetch-site']==='cross-site')return reply(403,{error:'다른 사이트에서 보낸 요청은 허용하지 않습니다.'});
    const url = new URL(req.url, 'http://localhost');
    if(req.method==='GET'&&url.pathname==='/app/'){
      const page=await getHostedPage();
      res.setHeader('Content-Security-Policy',page.policy);
      res.setHeader('Vary','Accept-Encoding');
      const compressed=acceptsGzip(req.headers['accept-encoding']);
      if(compressed)res.setHeader('Content-Encoding','gzip');
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(compressed?page.gzip:page.body);
    }
    if (req.method === 'GET' && url.pathname === '/brand-image.svg') {
      const image = brandImage(resolve(root,'public/calligraphy.png'),url.searchParams.get('language'));
      res.writeHead(200, {'Content-Type':'image/svg+xml','Cache-Control':'no-cache'});
      return res.end(image);
    }
    if (req.method === 'GET' && staticFiles[url.pathname]) {
      let content;
      try{content=readFileSync(resolve(root,'public',staticFiles[url.pathname]));}
      catch(error){return reply(error.code==='ENOENT'?404:503,{error:'화면 파일을 불러오지 못했습니다. 서버의 화면 준비 상태를 확인해 주세요.'});}
      res.writeHead(200, {'Content-Type':url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache'});
      return res.end(content);
    }
    if(req.method==='GET'&&url.pathname==='/api/health')return reply(200,{ok:true});
    const token=tokenFrom(req),user=findSession(db,token);
    const connections=connectionState();
    const cookie=(value,maxAge)=>res.setHeader('Set-Cookie',`clover_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.PUBLIC_ORIGIN?'; Secure':''}`);
    const loggedIn=result=>{if(result.pendingApproval)return result;if(req.headers['x-clover-client']==='native')return result;cookie(result.token,Math.floor((result.expiresAt-Date.now())/1000));const {token:secret,...safe}=result;return safe;};
    if(req.method==='GET'&&url.pathname==='/api/auth/config')return reply(200,{registration:true,maps:connections.maps,organizations:db.organizations.map(({id,name})=>({id,name}))});
    if(req.method==='GET'&&url.pathname==='/api/auth/me'){if(!user)throw authError('로그인이 필요합니다.',401);return reply(200,scopedState(db,user).auth);}
    if(req.method==='GET'&&url.pathname==='/api/auth/caregiver-approvals'){if(!user)throw authError('로그인이 필요합니다.',401);return reply(200,auth.caregiverApprovals(user));}
    if(req.method==='GET'&&url.pathname==='/api/auth/social-approvals'){if(!user)throw authError('로그인이 필요합니다.',401);return reply(200,auth.socialApprovals(user));}
    if(req.method==='GET'&&url.pathname==='/api/agent/tools'){if(!user)throw authError('로그인이 필요합니다.',401);return reply(200,agent.catalog(user));}
    if(['/api/sos','/api/sos/resolve'].includes(url.pathname))return reply(410,{error:'제공이 종료된 기능입니다.'});
    if(req.method==='GET'&&url.pathname==='/api/state'){if(!user)throw authError('로그인이 필요합니다.',401);return reply(200,{...scopedState(db,user),connections});}
    if (req.method !== 'POST') return reply(404,{error:'찾을 수 없습니다.'});
    const publicAuth=['/api/auth/register','/api/auth/login','/api/auth/pair'].includes(url.pathname);
    if(!publicAuth&&!user)throw authError('로그인이 필요합니다.',401);
    if(!req.headers.authorization&&req.headers.cookie&&req.headers.origin!==allowedOrigins.find(o=>new URL(o).host===host))throw authError('요청 출처를 확인해 주세요.',403);
    if(url.pathname!=='/api/voice'&&!String(req.headers['content-type']).startsWith('application/json'))throw authError('JSON 요청이 필요합니다.',415);
    const chunks=[]; let size=0;
    for await (const chunk of req) {size += chunk.length; if (size>(url.pathname.startsWith('/api/voice')?12*1024*1024:32768)) return reply(413,{error:'녹음이 너무 길어요. 짧게 다시 말씀해 주세요.'}); chunks.push(chunk);}
    const raw = Buffer.concat(chunks);
    if (url.pathname === '/api/voice') {
      const elderId = url.searchParams.get('elderId');
      if (!db.elders.some(e => e.id === elderId)) throw Error('담당 보호사의 기기 연결이 필요해요.');
      const checkinId=url.searchParams.get('checkinId');authorize(db,user,'voice',{elderId,checkinId});
      const result=await processVoice(raw,req.headers['content-type']||'audio/webm',elderId,checkinId,url.searchParams.get('attemptId')||undefined);return reply(result.checkin?200:201,result);
    }
    const body = JSON.parse(raw.toString() || '{}');
    if(!body||typeof body!=='object'||Array.isArray(body))throw authError('요청 내용을 확인해 주세요.');
    const ip=clientAddress(req,config.trustProxy);
    if(url.pathname==='/api/auth/register')return reply(201,loggedIn(await auth.register(body,ip)));
    if(url.pathname==='/api/auth/login')return reply(200,loggedIn(await auth.login(body,ip)));
    if(url.pathname==='/api/auth/pair')return reply(200,loggedIn(auth.pair(body,ip)));
    authorize(db,user,url.pathname.slice(5),body);
    if(url.pathname==='/api/agent/chat')return reply(200,await agent.chat(user,body));
    if(url.pathname==='/api/agent/tool')return reply(200,await agent.tool(user,body));
    if(url.pathname==='/api/agent/confirm')return reply(200,agent.confirm(user,body));
    if(url.pathname==='/api/request-feedback'){const result=commit(next=>{const r=requestFeedback(next,user,body);if(body.action==='confirm')markElderRequest(next,r.elderId);return r;});return reply(200,result);}
    if(url.pathname==='/api/organizations'){if(typeof body.name!=='string'||!body.name.trim()||body.name.length>80)throw Error('기관 이름을 입력해 주세요.');const org={id:randomUUID(),name:body.name.trim()};commit(next=>next.organizations.push(org));return reply(201,org);}
    if(url.pathname==='/api/elder-notes'){const next=structuredClone(db),result=saveElderNotes(next,body,user);save(next);db=next;return reply(200,result);}
    if(url.pathname==='/api/resolve-candidates')return reply(200,{caregivers:resolveCandidates(db,db.requests.find(r=>r.id===body.id),body)});
    if(url.pathname==='/api/voice-recording')return reply(200,voiceFallback.recording(body.id));
    if(url.pathname==='/api/auth/approve-caregiver')return reply(200,auth.approveCaregiver(user,body.userId));
    if(url.pathname==='/api/auth/approve-social')return reply(200,auth.approveSocial(user,body.userId));
    if(url.pathname==='/api/auth/logout'){const result=auth.logout(user);cookie('',0);return reply(200,result);}
    if(url.pathname==='/api/auth/password'){const result=await auth.changePassword(user,body);cookie('',0);return reply(200,result);}
    if(url.pathname==='/api/auth/pair-code')return reply(201,auth.pairCode(user,body.elderId));
    if (url.pathname === '/api/voice-json') {
      if (!db.elders.some(e => e.id === body.elderId)) throw Error('담당 보호사의 기기 연결이 필요해요.');
      const audio = decodeNativeAudio(body);
      const result=await processVoice(audio,body.mimeType,body.elderId,body.checkinId,body.attemptId);return reply(result.checkin?200:201,result);
    }
    if(url.pathname==='/api/wellness/device'){
      if(typeof body.id!=='string'||!/^[-a-zA-Z0-9]{8,80}$/.test(body.id)||!['android','ios'].includes(body.platform)||!['elder','caregiver','social','admin'].includes(body.role)||!['granted','denied','prompt','error'].includes(body.permission))throw Error('기기 등록 정보를 확인해 주세요.');
      if(body.role==='elder'&&!db.elders.some(e=>e.id===body.elderId))throw Error('어르신을 찾을 수 없습니다.');
      const token=typeof body.token==='string'?body.token:'';
      if(body.permission==='granted'&&(!token||token.length>4096||!(body.platform==='ios'?/^[a-fA-F0-9]+$/:/^[a-zA-Z0-9:_-]+$/).test(token)))throw Error('푸시 기기 등록 정보를 확인해 주세요.');
      commit(next=>{
       next.wellnessDevices=next.wellnessDevices.filter(d=>d.id!==body.id&&(!token||d.token!==token));
       next.wellnessDevices.push({userId:user.id,sessionHash:user.sessionHash,id:body.id,platform:body.platform,role:body.role,elderId:body.role==='elder'?body.elderId:null,permission:body.permission,token,lastSeenAt:Date.now()});
      });return reply(200,{registered:true});
    }
    if(url.pathname==='/api/wellness/device-disable'){if(db.wellnessDevices.some(d=>d.id===body.id))commit(next=>{const device=next.wellnessDevices.find(d=>d.id===body.id);device.permission='denied';device.token='';});return reply(200,{disabled:true});}
    if(['/api/wellness/activity','/api/wellness/reply','/api/wellness/resolve','/api/wellness/settings','/api/wellness/demo'].includes(url.pathname)){const result=commit(next=>wellnessCommand(next,url.pathname.slice(5),body,Date.now(),organizationOf(user)));return reply(200,result);}
    if (url.pathname === '/api/demo-request') return reply(201,addRequest({elderId:body.elderId, service:body.service, requestedAt:body.requestedAt ?? null, transcript:'담당자 시연 요청'},true));
    if (url.pathname === '/api/action') {
      const result=commit(next=>{const request=next.requests.find(r=>r.id===body.id);if(!request)throw Error('요청을 찾을 수 없습니다.');transition(next,request,body.action,body);return request;});
      return reply(200,result);
    }
    if (url.pathname === '/api/elders') {
      const consent=registrationConsent(body,{proxyRequired:true});
      for (const key of ['name','address','contact']) if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 200) throw Error('이름, 주소, 연락처를 확인해 주세요.');
      const coords = await geocode(body.address);
      if(!Number.isFinite(coords.lat)||!Number.isFinite(coords.lng)||Math.abs(coords.lat)>90||Math.abs(coords.lng)>180)throw Error('주소의 위치를 확인하지 못했습니다.');
      const elder = {organizationId:organizationOf(user),ownerCaregiverId:user.role==='caregiver'?user.caregiverId:null,id:randomUUID(),name:body.name.trim(),address:body.address.trim(),contact:body.contact.trim(),...coords};
      elder.consent={...consent,recordedBy:user.id};commit(next=>{authorize(next,findSession(next,token),'elders',body);next.elders.push(elder);});return reply(201,elder);
    }
    if (url.pathname === '/api/caregivers') {
      const caregiver=await updateCaregiverProfile({getDb:()=>db,commit,authorize:next=>authorize(next,findSession(next,token),'caregivers',body)},body,{geocode:caregiverGeocode});
      return reply(body.id?200:201,caregiver);
    }
    if (url.pathname === '/api/availability') {
      const result=commit(next=>{const caregiver=next.caregivers.find(c=>c.id===body.id);if(!caregiver)throw Error('요양보호사를 찾을 수 없습니다.');Object.assign(caregiver,validateHours(body));return caregiver;});
      return reply(200,result);
    }
    return reply(404,{error:'찾을 수 없습니다.'});
  } catch(error) {const status=error.status||400; reply(status,{error:error.message || '요청을 처리하지 못했습니다.'});}
});
const runWellness=createWellnessWorker({getDb:()=>db,save,send:sendPushJob});
server.headersTimeout=15000;
server.requestTimeout=60000;
server.keepAliveTimeout=5000;
const wellnessTimer=setInterval(()=>{runWellness().catch(()=>console.error('안부 확인 작업 처리 실패: 서버 상태와 저장소를 확인하세요.'));},15000);
wellnessTimer.unref();
void runWellness().catch(()=>console.error('안부 확인 초기 처리 실패'));
server.listen(port,host,()=>console.log(`CLover care: ${config.publicOrigin||config.lanOrigin||'http://localhost:'+port}/app/`));
