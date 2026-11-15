import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {spawn} from 'node:child_process';import {once} from 'node:events';import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve,sep} from 'node:path';import {hashPassword} from '../lib/auth.mjs';import {seoulDay} from '../lib/scheduler.mjs';
test('녹음 이관 HTTP: 3회 실패→직원 전용 재생→재시작→해석·일정 저장·보호사 수락',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'clover-handoff-http-'));let child,text='',busy=false;
 const backend=http.createServer(async(req,res)=>{for await(const part of req){}res.setHeader('Content-Type','application/json');if(busy){res.statusCode=503;res.end('{}');return;}res.end(JSON.stringify(req.url==='/stt'?{text}:{message:{content:JSON.stringify({service:'식사 도움',needsReview:false,requestedAt:null,summary:'가상 식사 요청'})}}));});backend.listen(0,'127.0.0.1');await once(backend,'listening');const ai='http://127.0.0.1:'+backend.address().port;
 const port=45000+Math.floor(Math.random()*10000),origin='http://127.0.0.1:'+port,password='Handoff-only-test-2026!',passwordHash=await hashPassword(password);
 const db={elders:[{id:'e',name:'가상 어르신',lat:37.56,lng:126.92,wellnessEnabled:false},{id:'other',name:'다른 어르신',lat:37.56,lng:126.92,wellnessEnabled:false}],caregivers:[{id:'c',name:'가상 보호사',lat:37.56,lng:126.92,from:0,to:24,days:[0,1,2,3,4,5,6],services:['식사 도움']}],requests:[],accounts:[{role:'elder',elderId:'e'},{role:'caregiver',approvalStatus:'approved',caregiverId:'c'},{role:'social',approvalStatus:'approved'},{role:'admin'},{role:'social',approvalStatus:'pending'}].map((a,i)=>({...a,id:'a'+i,name:'가상 계정',email:'handoff'+i+'@example.test',passwordHash}))};
 const launch=async()=>{child=spawn(process.execPath,['server.mjs'],{env:{...process.env,CLOVER_DATA_DIR:dir,PORT:String(port),HOST:'127.0.0.1',PUBLIC_ORIGIN:'',LAN_ORIGIN:'',NODE_ENV:'development',STT_URL:ai+'/stt',STT_TOKEN:'',OLLAMA_URL:ai,OLLAMA_MODEL:'mock'},stdio:'ignore'});for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('server not ready');};
 const stop=async()=>{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}};
 const post=async(path,body,token)=>{const r=await fetch(origin+'/api/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Clover-Client':'native',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const audio=Buffer.from('fake-audio-for-access-test').toString('base64');
 try{await writeFile(join(dir,'state.json'),JSON.stringify(db));await launch();const tokens=[];for(let i=0;i<4;i++){const login=await post('auth/login',{email:'handoff'+i+'@example.test',password});assert.equal(login.status,200);tokens.push(login.data.token);}assert.equal((await post('auth/login',{email:'handoff4@example.test',password})).status,403);
 const voice=n=>post('voice-json',{elderId:'e',mimeType:'audio/mp4',audioBase64:audio,attemptId:'attempt-'+n},tokens[0]);
 assert.equal((await post('voice-json',{elderId:'other',mimeType:'audio/mp4',audioBase64:audio},tokens[0])).status,403);
 busy=true;assert.equal((await voice(0)).status,400);busy=false;
 assert.equal((await voice(1)).status,422);assert.equal((await voice(1)).status,422);assert.equal((await voice(2)).status,422);
 await stop();await launch();
 const result=await voice(3);assert.equal(result.status,201);const request=result.data;assert.equal(request.status,'attention');assert.equal(request.voiceReview.attempts,3);assert.equal((await voice(3)).data.id,request.id);
 for(const token of [undefined,tokens[0],tokens[1]])assert.equal((await post('voice-recording',{id:request.id},token)).status,token?403:401);
 for(const token of [tokens[2],tokens[3]]){const r=await post('voice-recording',{id:request.id},token);assert.equal(r.status,200);assert.equal(r.data.audioBase64,audio);assert.equal(r.data.mimeType,'audio/mp4');}
 assert.equal((await fetch(origin+'/voice-recordings/'+request.id+'.audio')).status,404);
 const stored=JSON.parse(await readFile(join(dir,'state.json'),'utf8'));assert.equal(stored.requests.length,1);assert.ok(!JSON.stringify(stored).includes(audio));
 const body={id:request.id,action:'resolve',service:'식사 도움',transcript:'내일 오후 두시에 식사 준비를 도와 달라는 말씀입니다.',caregiverId:'c',start:seoulDay(Date.now()+86400000)+'T14:00:00+09:00',note:'녹음 확인 후 일정 입력'};
 assert.equal((await post('action',body,tokens[0])).status,403);assert.equal((await post('action',body,tokens[1])).status,403);
 assert.equal((await post('action',{...body,transcript:''},tokens[2])).status,400);
 const assigned=await post('action',body,tokens[2]);assert.equal(assigned.status,200);assert.equal(assigned.data.status,'pending');assert.equal(assigned.data.service,'식사 도움');assert.ok(assigned.data.voiceReview.resolvedAt);assert.equal(assigned.data.transcript,body.transcript);
 assert.equal((await post('action',{id:request.id,action:'accept'},tokens[1])).data.status,'confirmed');
 await stop();await launch();assert.equal((await post('voice-recording',{id:request.id},tokens[2])).data.audioBase64,audio);
 const state=await (await fetch(origin+'/api/state',{headers:{Authorization:'Bearer '+tokens[0]}})).json();assert.equal(state.requests[0].status,'confirmed');assert.equal(state.voiceFailures,undefined);
 }finally{await stop();backend.closeAllConnections();await new Promise(r=>backend.close(r));const target=resolve(dir);assert.ok(target.startsWith(resolve(tmpdir())+sep)&&target.includes('clover-handoff-http-'));await rm(target,{recursive:true,force:true});}
});
