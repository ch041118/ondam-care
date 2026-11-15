import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService,ensureAuth,findSession,authorize,scopedState,digest } from '../lib/auth.mjs';
import { ensureWellness } from '../lib/wellness.mjs';
function fixture(){let now=Date.parse('2026-09-28T09:00:00+09:00');let db=ensureAuth(ensureWellness({caregivers:[],elders:[],requests:[]}));const service=createAuthService({getDb:()=>db,commit:fn=>{const next=structuredClone(db),result=fn(next);db=next;return result;},clock:()=>now,geocode:async()=>({lat:37.56,lng:126.92})});return {service,get db(){return db;},setTime:v=>now=v,now:()=>now};}
const signup=email=>({consent:{version:'2026-10-02',personal:true,authority:true},email,password:'Test-only-password-2026!',name:'테스트보호사',address:'테스트 기준 주소',from:9.5,to:18,days:[1,2,3,4,5],services:['생활 도움']});
test('가입 검증: 잘못된 비밀번호는 외부 주소 조회 전에 거부한다',async()=>{
 const db=ensureAuth(ensureWellness({caregivers:[],elders:[],requests:[]}));let lookups=0;
 const service=createAuthService({getDb:()=>db,commit:fn=>fn(db),geocode:async()=>{lookups++;return {lat:37,lng:127};}});
 for(const role of ['caregiver','elder'])await assert.rejects(service.register({...signup(role+'@example.test'),role,contact:'010-0000-0000',password:'short'},role),/비밀번호/);
 assert.equal(lookups,0);assert.equal(db.accounts.length,0);
});
test('가입 검증: 잘못된 위치 응답으로 어르신 계정을 만들지 않는다',async()=>{
 const db=ensureAuth(ensureWellness({caregivers:[],elders:[],requests:[]}));
 const service=createAuthService({getDb:()=>db,commit:fn=>fn(db),geocode:async()=>({lat:999,lng:127})});
 await assert.rejects(service.register({...signup('coordinates@example.test'),role:'elder',contact:'010-0000-0000'},'bad-location'),/위치/);
 assert.equal(db.accounts.length,0);assert.equal(db.elders.length,0);
});
async function approvedSignup(f,body,ip){const pending=await f.service.register(body,ip);assert.equal(pending.pendingApproval,true);assert.equal(pending.token,undefined);if(!f.db.accounts.some(a=>a.id==='fixture-admin'))f.db.accounts.push({id:'fixture-admin',role:'admin'});f.service.approveCaregiver({id:'fixture-admin',role:'admin'},f.db.accounts.find(a=>a.email===body.email.toLowerCase()).id);return f.service.login(body,ip);}
test('인증: 가입·중복·로그인·만료·로그아웃·재시작',async()=>{const f=fixture(),r=await approvedSignup(f,signup('One@example.com'),'1');assert.equal(r.user.email,'one@example.com');assert.ok(f.db.accounts[0].passwordHash.startsWith('scrypt$'));assert.ok(!JSON.stringify(f.db).includes(signup('').password));assert.ok(!JSON.stringify(f.db).includes(r.token));await assert.rejects(f.service.register(signup('one@example.com'),'1'),e=>e.status===409);await assert.rejects(f.service.register({...signup('social@example.com'),role:'admin'},'1'),e=>e.status===403);await assert.rejects(f.service.login({email:'one@example.com',password:'wrong'},'1'),e=>e.status===401);const logged=await f.service.login({email:'ONE@example.com',password:signup('').password},'1');assert.ok(findSession(JSON.parse(JSON.stringify(f.db)),logged.token,f.now()));f.service.logout(findSession(f.db,logged.token,f.now()));assert.equal(findSession(f.db,logged.token,f.now()),null);assert.equal(findSession(f.db,r.token,f.now()+8*86400000),null);});
test('인증: 권한과 상태 응답을 계정별로 격리한다',async()=>{const f=fixture(),a=await approvedSignup(f,signup('a@example.com'),'1'),b=await approvedSignup(f,signup('b@example.com'),'2');const user=findSession(f.db,a.token,f.now());f.db.elders.push({id:'e1',ownerCaregiverId:a.user.caregiverId},{id:'e2',ownerCaregiverId:b.user.caregiverId});f.db.requests.push({id:'r2',caregiverId:b.user.caregiverId,elderId:'e2'});assert.throws(()=>authorize(f.db,null,'caregivers',{}),e=>e.status===401);assert.throws(()=>authorize(f.db,user,'caregivers',{id:b.user.caregiverId}),e=>e.status===403);assert.throws(()=>authorize(f.db,user,'action',{id:'r2',action:'accept'}));assert.throws(()=>authorize(f.db,user,'wellness/settings',{}));assert.throws(()=>authorize(f.db,user,'voice-json',{elderId:'e2'}));const visible=scopedState(f.db,user);assert.deepEqual(visible.elders.map(e=>e.id),['e1']);assert.equal(visible.requests.length,0);assert.equal(visible.caregivers.length,1);assert.ok(!('accounts'in visible));assert.ok(!('sessions'in visible));assert.ok(!JSON.stringify(visible).includes('passwordHash'));});
test('인증: 어르신 연결 코드는 일회용·시간 제한·본인 범위만 허용한다',async()=>{const f=fixture(),r=await approvedSignup(f,signup('pair@example.com'),'1'),user=findSession(f.db,r.token,f.now());f.db.elders.push({id:'own',ownerCaregiverId:user.caregiverId},{id:'other'});assert.throws(()=>f.service.pairCode(user,'other'));const p=f.service.pairCode(user,'own');assert.ok(!JSON.stringify(f.db.pairCodes).includes(p.code));const linked=f.service.pair({code:p.code},'2'),elder=findSession(f.db,linked.token,f.now());assert.equal(elder.role,'elder');assert.throws(()=>f.service.pair({code:p.code},'2'));assert.doesNotThrow(()=>authorize(f.db,elder,'wellness/activity',{elderId:'own'}));assert.throws(()=>authorize(f.db,elder,'voice-json',{elderId:'other'}));assert.throws(()=>authorize(f.db,elder,'elders',{}));const next=f.service.pairCode(user,'own');f.setTime(f.now()+11*60000);assert.throws(()=>f.service.pair({code:next.code},'3'));});
test('인증: 비밀번호 변경 시 모든 세션과 연결 코드를 폐기한다',async()=>{const f=fixture(),r=await approvedSignup(f,signup('change@example.com'),'1'),user=findSession(f.db,r.token,f.now());await assert.rejects(f.service.changePassword(user,{currentPassword:'bad',password:'Changed-password-2026!'}));await f.service.changePassword(user,{currentPassword:signup('').password,password:'Changed-password-2026!'});assert.equal(findSession(f.db,r.token,f.now()),null);await assert.rejects(f.service.login({email:r.user.email,password:signup('').password},'1'));assert.ok((await f.service.login({email:r.user.email,password:'Changed-password-2026!'},'1')).token);});
test('인증: 반복 시도 제한과 실패한 주소 조회의 원자성',async()=>{const f=fixture();for(let i=0;i<10;i++)await assert.rejects(f.service.register({...signup('bad@example.com'),password:'short'},'1'));await assert.rejects(f.service.register(signup('bad@example.com'),'1'),e=>e.status===429);assert.equal(f.db.accounts.length,0);assert.equal(f.db.caregivers.length,0);});

test('인증: 주소 조회 실패·동시 중복 가입·저장 실패가 반쪽 계정을 만들지 않는다',async()=>{let db=ensureAuth(ensureWellness({caregivers:[],elders:[],requests:[]}));const bad=createAuthService({getDb:()=>db,commit:fn=>fn(db),geocode:async()=>{throw Error('주소 조회 실패');}});await assert.rejects(bad.register(signup('bad-address@example.com'),'1'));assert.equal(db.accounts.length,0);assert.equal(db.caregivers.length,0);const f=fixture();const results=await Promise.allSettled([f.service.register(signup('race@example.com'),'1'),f.service.register(signup('race@example.com'),'2')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.db.accounts.length,1);assert.equal(f.db.caregivers.length,1);const broken=createAuthService({getDb:()=>db,geocode:async()=>({lat:37,lng:127}),commit:fn=>{fn(structuredClone(db));throw Error('저장 실패');}});await assert.rejects(broken.register(signup('disk@example.com'),'1'));assert.equal(db.accounts.length,0);assert.equal(db.caregivers.length,0);});

test('가입 유형: 사회복지사·어르신 등록과 관리자 로그인, 어르신 정보 격리',async()=>{
 const f=fixture();
 const social=await f.service.register({consent:{version:'2026-10-02',personal:true,authority:true},email:'worker@example.com',password:'Worker-password-2026',role:'social',name:'복지사'},'social');
 const elder=await f.service.register({consent:{version:'2026-10-02',personal:true,authority:true},email:'elder@example.com',password:'Elder-password-2026',role:'elder',name:'어르신',address:'서울 마포구',contact:'010-0000-0000',elderId:'injected',ownerCaregiverId:'injected'},'elder');
 const e=findSession(f.db,elder.token,f.now());assert.equal(e.role,'elder');assert.ok(e.elderId);assert.notEqual(e.elderId,'injected');
 assert.equal(f.db.elders[0].ownerCaregiverId,null);
 f.db.elders.push({id:'other',name:'다른어르신'});
 assert.equal(scopedState(f.db,e).elders.length,1);
 assert.throws(()=>authorize(f.db,e,'wellness/settings',{}),x=>x.status===403);
 assert.throws(()=>authorize(f.db,e,'voice-json',{elderId:'other'}),x=>x.status===403);
 const logged=await f.service.login({email:'elder@example.com',password:'Elder-password-2026'},'elder');assert.equal(logged.user.elderId,e.elderId);
 assert.equal(social.pendingApproval,true);assert.equal(social.token,undefined);
 const {hashPassword}=await import('../lib/auth.mjs');f.db.accounts.push({id:'admin-id',email:'admin',name:'관리자',role:'admin',passwordHash:await hashPassword('adminpassword')});
 const admin=await f.service.login({email:'admin',password:'adminpassword'},'admin');const u=findSession(f.db,admin.token,f.now());assert.equal(u.role,'admin');f.service.approveSocial(u,f.db.accounts.find(a=>a.email==='worker@example.com').id);const workerLogin=await f.service.login({email:'worker@example.com',password:'Worker-password-2026'},'social');assert.doesNotThrow(()=>authorize(f.db,findSession(f.db,workerLogin.token,f.now()),'wellness/settings',{}));assert.equal(scopedState(f.db,u).elders.length,2);assert.doesNotThrow(()=>authorize(f.db,u,'wellness/settings',{}));
 await assert.rejects(f.service.register({consent:{version:'2026-10-02',personal:true,authority:true},email:'hack@example.com',name:'위조',password:'Hack-password-2026',role:'admin'},'hack'),x=>x.status===403);
});

test('사회복지사 승인: 관리자만 승인·조회, 가입 조작 차단, 승인 이력과 재로그인',async()=>{
 const f=fixture();const {hashPassword}=await import('../lib/auth.mjs');
 f.db.accounts.push({id:'admin-approval',email:'admin',name:'관리자',role:'admin',passwordHash:await hashPassword('Admin-test-passphrase')});
 const adminResult=await f.service.login({email:'admin',password:'Admin-test-passphrase'},'admin');const admin=findSession(f.db,adminResult.token,f.now());
 const input={consent:{version:'2026-10-02',personal:true,authority:true},email:'pending@example.test',name:'신청자',role:'social',password:'Social-test-passphrase',approvalStatus:'approved',approvedBy:admin.id};
 const registration=await f.service.register(input,'signup');assert.equal(registration.pendingApproval,true);assert.equal(registration.token,undefined);
 const account=f.db.accounts.find(a=>a.email===input.email);assert.equal(account.approvalStatus,'pending');assert.equal(account.approvedBy,undefined);
 await assert.rejects(f.service.login(input,'pending'),e=>e.status===403);
 assert.throws(()=>f.service.approveSocial({id:account.id,role:'social'},account.id),e=>e.status===403);
 assert.throws(()=>f.service.approveSocial({id:account.id,role:'admin'},account.id),e=>e.status===403);
 assert.throws(()=>f.service.socialApprovals({id:account.id,role:'social'}),e=>e.status===403);
 const list=f.service.socialApprovals(admin);assert.equal(list.accounts.length,1);assert.equal(JSON.stringify(list).includes('passwordHash'),false);
 assert.throws(()=>f.service.approveSocial(admin,'missing'),e=>e.status===404);
 f.service.approveSocial(admin,account.id);f.service.approveSocial(admin,account.id);
 assert.equal(f.db.accountApprovals.length,1);assert.equal(f.db.accountApprovals[0].adminId,admin.id);
 assert.equal(f.db.accounts.find(a=>a.id===account.id).approvedBy,admin.id);
 const login=await f.service.login(input,'approved'),user=findSession(f.db,login.token,f.now());assert.equal(user.approvalStatus,'approved');assert.doesNotThrow(()=>authorize(f.db,user,'wellness/settings',{}));
 assert.throws(()=>authorize(f.db,user,'auth/approve-social',{userId:account.id}),e=>e.status===403);
 assert.throws(()=>f.service.socialApprovals(user),e=>e.status===403);
});
test('사회복지사 승인: 기존 미승인 계정의 세션·연결 코드·알림 권한도 회수',()=>{
 const token='1'.repeat(64);const db=ensureAuth({accounts:[{id:'legacy',role:'social'}],sessions:[{userId:'legacy',hash:digest(token),role:'social',expiresAt:Date.now()+60000}],pairCodes:[{userId:'legacy'}],wellnessDevices:[{userId:'legacy',token:'old',permission:'granted'}]});
 assert.equal(db.accounts[0].approvalStatus,'pending');assert.equal(findSession(db,token),null);assert.equal(db.sessions.length,0);assert.equal(db.pairCodes.length,0);assert.equal(db.wellnessDevices[0].token,'');assert.throws(()=>scopedState(db,{role:'social',approvalStatus:'pending'}),e=>e.status===403);
});
