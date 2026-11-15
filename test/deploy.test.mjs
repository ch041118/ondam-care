import test from 'node:test';
import assert from 'node:assert/strict';
import {serverConfig,clientAddress} from '../lib/server-config.mjs';
import {lockDataDirectory} from '../lib/data-lock.mjs';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';

test('배포: 로컬 기본값과 명시적 HTTPS 배포 설정',()=>{
 assert.equal(serverConfig({}).host,'127.0.0.1');
 assert.throws(()=>serverConfig({HOST:'0.0.0.0'}));
 assert.throws(()=>serverConfig({NODE_ENV:'production'}));
 for(const origin of ['http://care.example.org','https://care.example.org/path','https://a:b@care.example.org','https://care.example.org/?x=1'])assert.throws(()=>serverConfig({PUBLIC_ORIGIN:origin}));
 const c=serverConfig({HOST:'0.0.0.0',PUBLIC_ORIGIN:'https://care.example.org/',NODE_ENV:'production',TRUST_PROXY:'true'});assert.equal(c.publicOrigin,'https://care.example.org');assert.ok(c.hosts.includes('care.example.org'));assert.equal(c.trustProxy,true);
});
test('배포: 명시적으로 신뢰한 프록시의 마지막 IP만 사용',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{'x-forwarded-for':'192.0.2.1, 198.51.100.2'}};
 assert.equal(clientAddress(req,false),'127.0.0.1');assert.equal(clientAddress(req,true),'198.51.100.2');req.headers['x-forwarded-for']='invalid';assert.equal(clientAddress(req,true),'127.0.0.1');
});
test('배포: 동일 PID 재시작의 오래된 잠금 복구 및 중복 writer 차단',()=>{
 const dir=mkdtempSync(join(tmpdir(),'clover-lock-test-'));
 try{writeFileSync(join(dir,'.clover-writer.lock'),JSON.stringify({pid:process.pid,createdAt:1}));const release=lockDataDirectory(dir);assert.throws(()=>lockDataDirectory(dir));release();lockDataDirectory(dir)();}finally{assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('clover-lock-test-'));rmSync(dir,{recursive:true,force:true});}
});
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {request} from 'node:http';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('배포 HTTP: 프록시 도메인·Secure 쿠키·출처 차단·운영 데이터 유지',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'clover-deploy-test-')),port=45000+Math.floor(Math.random()*8000);let child;
 const send=(path,body,headers={})=>new Promise((resolve,reject)=>{const payload=body===undefined?'':JSON.stringify(body);const r=request({hostname:'127.0.0.1',port,path:'/api/'+path,method:body===undefined?'GET':'POST',headers:{Host:'care.example.org',Origin:'https://care.example.org','Content-Type':'application/json',...headers}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(text)}));});r.on('error',reject);r.end(payload);});
 const stop=async()=>{if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}};
 const start=async()=>{child=spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(port),PUBLIC_ORIGIN:'https://care.example.org',CLOVER_DATA_DIR:dir,TRUST_PROXY:'true',NAVER_CLIENT_ID:'',NAVER_CLIENT_SECRET:''},stdio:'ignore'});for(let i=0;i<100;i++){try{if((await send('health')).status===200)return;}catch{}if(child.exitCode!==null)throw Error('Deployment test server failed');await sleep(50);}throw Error('Deployment server timeout');};
 try{
  await start();assert.equal((await send('health',undefined,{Host:'evil.example.org'})).status,403);assert.equal((await send('health',undefined,{Origin:'https://evil.example.org'})).status,403);
  const health=await send('health');
  assert.equal(health.headers['strict-transport-security'],'max-age=31536000');
  assert.equal(health.headers['x-frame-options'],'DENY');
  assert.equal(health.headers['permissions-policy'],'microphone=(self), camera=(), geolocation=()');
  assert.equal((await send('auth/login',{email:'admin',password:'fake'},{Origin:'','Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await send('auth/login',{email:'admin',password:'adminpassword'})).status,401);
  const registered=await send('auth/register',{consent:{version:'2026-10-02',personal:true,authority:true},role:'elder',contact:'010-0000-0000',email:'deploy@example.test',password:'Deployment-test-2026!',name:'배포검증',address:'서울 마포구',from:9,to:18,days:[1,2,3,4,5],services:['생활 도움']});assert.equal(registered.status,201);const cookie=registered.headers['set-cookie'][0];assert.match(cookie,/; Secure/);assert.match(cookie,/HttpOnly/);const session=cookie.split(';')[0];
  const state=await send('state',undefined,{Cookie:session});assert.equal(state.status,200);assert.equal(state.body.elders.length,1);assert.equal(state.body.requests.length,0);
  assert.equal((await send('auth/logout',{}, {Cookie:session,Origin:''})).status,403);
  await stop();await start();assert.equal((await send('state',undefined,{Cookie:session})).status,200);
  assert.equal((await send('auth/logout',{}, {Cookie:session})).status,200);assert.equal((await send('state',undefined,{Cookie:session})).status,401);
 }finally{await stop();assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('clover-deploy-test-'));rmSync(dir,{recursive:true,force:true});}
});

test('LAN: 정확한 사설 IP만 허용하며 운영 HTTPS 설정과 혼용하지 않는다',()=>{
 const env={HOST:'172.27.16.228',LAN_ORIGIN:'http://172.27.16.228:3000'};
 const c=serverConfig(env);assert.equal(c.host,env.HOST);assert.ok(c.origins.includes(env.LAN_ORIGIN));
 for(const patch of [{NODE_ENV:'production'},{HOST:'0.0.0.0'},{LAN_ORIGIN:'http://172.27.16.228:4000'},{HOST:'8.8.8.8',LAN_ORIGIN:'http://8.8.8.8:3000'},{PUBLIC_ORIGIN:'https://care.example.org'}])assert.throws(()=>serverConfig({...env,...patch}));
});
