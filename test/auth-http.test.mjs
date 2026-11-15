import {seed} from '../lib/seed.mjs';
import {hashPassword} from '../lib/auth.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm,mkdir,rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,dirname,basename } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
test('HTTP 인증: 비로그인 차단·쿠키/Bearer·ID 변조·재시작·로그아웃',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'clover-auth-')),port=34000+Math.floor(Math.random()*10000),origin=`http://127.0.0.1:${port}`;let child;
 const launch=async()=>{child=spawn(process.execPath,['server.mjs'],{cwd:process.cwd(),env:{...process.env,CLOVER_DATA_DIR:dir,PORT:String(port),PUBLIC_ORIGIN:'',NAVER_CLIENT_ID:'',NAVER_CLIENT_SECRET:''},stdio:['ignore','pipe','pipe']});for(let n=0;n<100;n++){try{if((await fetch(origin+'/api/auth/config')).ok)return;}catch{}if(child.exitCode!==null)throw Error('test server failed');await pause(50);}throw Error('test server timeout');};
 const stop=async()=>{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}};
 const post=async(path,body={},headers={})=>{const r=await fetch(origin+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(body)});return {response:r,data:await r.json()};};
 const profile={consent:{version:'2026-10-02',personal:true,authority:true},name:'통합테스트',email:'integration@example.com',password:'Integration-test-2026!',address:'서울 마포구 연남동',from:9,to:18,days:[1,2,3,4,5],services:['생활 도움']};
 try{const initial=seed();initial.accounts=[{id:'http-admin',email:'admin',name:'관리자',role:'admin',passwordHash:await hashPassword('Http-admin-2026!')}];await writeFile(join(dir,'state.json'),JSON.stringify(initial));await launch();assert.equal((await fetch(origin+'/api/state')).status,401);const registered=await post('auth/register',profile);assert.equal(registered.response.status,201);assert.equal(registered.data.token,undefined);assert.equal(registered.data.pendingApproval,true);assert.equal(registered.response.headers.get('set-cookie'),null);
 assert.equal((await post('auth/login',profile)).response.status,403);
 const bootstrapAdmin=await post('auth/login',{email:'admin',password:'Http-admin-2026!'},{'X-Clover-Client':'native'}),bootstrapHeaders={Authorization:'Bearer '+bootstrapAdmin.data.token};
 const carers=await (await fetch(origin+'/api/auth/caregiver-approvals',{headers:bootstrapHeaders})).json();assert.equal(carers.accounts.length,1);assert.equal(carers.accounts[0].status,'pending');
 assert.equal((await post('auth/approve-caregiver',{userId:carers.accounts[0].id})).response.status,401);
 assert.equal((await post('auth/approve-caregiver',{userId:carers.accounts[0].id},bootstrapHeaders)).response.status,200);
 const caregiverLogin=await post('auth/login',profile);assert.equal(caregiverLogin.response.status,200);const cookie=caregiverLogin.response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);const sessionCookie=cookie.split(';')[0];const stateResponse=await fetch(origin+'/api/state',{headers:{Cookie:sessionCookie}});const state=await stateResponse.json();assert.equal(state.caregivers.length,1);assert.equal(state.elders.length,0);assert.equal(state.caregivers[0].locationVerified,false);assert.equal(state.auth.user.email,profile.email);assert.ok(!('accounts'in state));assert.ok(!('pairCodes'in state));assert.equal((await post('caregivers',{...profile,id:'c1'},{Cookie:sessionCookie})).response.status,403);assert.equal((await post('wellness/settings',{enabled:false},{Cookie:sessionCookie})).response.status,403);assert.equal((await post('auth/register',{...profile,email:'social@example.com',role:'admin'})).response.status,403);const pendingProfile={consent:{version:'2026-10-02',personal:true,authority:true},email:'pending-http@example.test',password:'Pending-http-2026!',name:'복지사',role:'social',approvalStatus:'approved'};
 const pending=await post('auth/register',pendingProfile);assert.equal(pending.response.status,201);assert.equal(pending.data.pendingApproval,true);assert.equal(pending.data.token,undefined);assert.equal(pending.response.headers.get('set-cookie'),null);
 assert.equal((await post('auth/login',pendingProfile)).response.status,403);
 assert.equal((await fetch(origin+'/api/auth/social-approvals')).status,401);
 assert.equal((await fetch(origin+'/api/auth/social-approvals',{headers:{Cookie:sessionCookie}})).status,403);
 const adminLogin=await post('auth/login',{email:'admin',password:'Http-admin-2026!'},{'X-Clover-Client':'native'});const adminHeaders={Authorization:'Bearer '+adminLogin.data.token};
 // Use only the temporary fixture directory to simulate a failed disk write.
 const beforeFailure=await (await fetch(origin+'/api/state',{headers:adminHeaders})).json(),blockedPath=join(dir,'state.json.tmp');
 assert.equal(dirname(resolve(blockedPath)),resolve(dir));await mkdir(blockedPath);
 try{
  assert.equal((await post('availability',{id:state.caregivers[0].id,from:10,to:17,days:[1,2]},{Cookie:sessionCookie})).response.status,400);
  assert.equal((await post('caregivers',{...profile,id:state.caregivers[0].id,from:11},{Cookie:sessionCookie})).response.status,400);
  assert.equal((await post('demo-request',{elderId:'e1',service:'생활 도움'},adminHeaders)).response.status,400);
  assert.equal((await post('wellness/settings',{enabled:false,hour:20,minute:0,maxAttempts:4},adminHeaders)).response.status,400);
  const afterFailure=await (await fetch(origin+'/api/state',{headers:adminHeaders})).json();
  for(const field of ['caregivers','requests','wellnessSettings'])assert.deepEqual(afterFailure[field],beforeFailure[field],field+' must survive failed persistence');
 }finally{await rmdir(blockedPath);}
 assert.equal((await post('availability',{id:state.caregivers[0].id,from:10,to:17,days:[1,2]},{Cookie:sessionCookie})).response.status,200);
 const approvalList=await (await fetch(origin+'/api/auth/social-approvals',{headers:adminHeaders})).json();assert.equal(approvalList.accounts.length,1);assert.equal(approvalList.accounts[0].status,'pending');assert.ok(!JSON.stringify(approvalList).includes('passwordHash'));
 const id=approvalList.accounts[0].id;assert.equal((await post('auth/approve-social',{userId:id},{Cookie:sessionCookie})).response.status,403);assert.equal((await post('auth/approve-social',{userId:id},adminHeaders)).response.status,200);
 const approvedLogin=await post('auth/login',pendingProfile,{'X-Clover-Client':'native'});assert.equal(approvedLogin.response.status,200);const socialHeaders={Authorization:'Bearer '+approvedLogin.data.token};assert.equal((await post('auth/approve-caregiver',{userId:carers.accounts[0].id},socialHeaders)).response.status,403);assert.equal((await fetch(origin+'/api/auth/caregiver-approvals',{headers:{Cookie:sessionCookie}})).status,403);assert.equal((await post('auth/approve-social',{userId:id},socialHeaders)).response.status,403);assert.equal((await fetch(origin+'/api/auth/social-approvals',{headers:socialHeaders})).status,403);
 assert.equal((await post('auth/login',{email:profile.email,password:'bad'})).response.status,401);const native=await post('auth/login',{email:profile.email,password:profile.password},{'X-Clover-Client':'native'});assert.equal(native.response.status,200);assert.match(native.data.token,/^[a-f0-9]{64}$/);assert.equal(native.response.headers.get('set-cookie'),null);await stop();await launch();assert.equal((await fetch(origin+'/api/state',{headers:socialHeaders})).status,200);assert.equal((await fetch(origin+'/api/state',{headers:{Authorization:'Bearer '+native.data.token}})).status,200);assert.equal((await post('auth/logout',{}, {Authorization:'Bearer '+native.data.token})).response.status,200);assert.equal((await fetch(origin+'/api/state',{headers:{Authorization:'Bearer '+native.data.token}})).status,401);const missingOrigin=await fetch(origin+'/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json',Cookie:sessionCookie},body:'{}'});assert.equal(missingOrigin.status,403);await post('auth/logout',{}, {Cookie:sessionCookie});assert.equal((await fetch(origin+'/api/state',{headers:{Cookie:sessionCookie}})).status,401);const saved=await readFile(join(dir,'state.json'),'utf8');assert.ok(!saved.includes(profile.password));assert.ok(!saved.includes(native.data.token));}finally{await stop();assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('clover-auth-'));await rm(dir,{recursive:true,force:true});}
});
