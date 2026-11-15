import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthService,ensureAuth,findSession,digest,authorize,scopedState} from '../lib/auth.mjs';
import {match,transition} from '../lib/scheduler.mjs';
test('보호사 승인: 가입 필드 조작·본인 승인 차단, 관리자 승인 후 로그인',async()=>{
 const db=ensureAuth({accounts:[{id:'admin',role:'admin'}],caregivers:[],elders:[],requests:[]});
 const service=createAuthService({getDb:()=>db,commit:fn=>fn(db),geocode:async()=>({lat:37.56,lng:126.92})});
 const input={consent:{version:'2026-10-02',personal:true,authority:true},email:'pending@example.test',password:'Approval-test-2026!',name:'가상 보호사',address:'가상 주소',from:9,to:18,days:[1,2,3,4,5],services:['생활 도움'],approvalStatus:'approved',approvedBy:'admin'};
 const result=await service.register(input,'signup');assert.equal(result.pendingApproval,true);assert.equal(result.token,undefined);assert.equal(db.sessions.length,0);
 const account=db.accounts.find(a=>a.role==='caregiver');assert.equal(account.approvalStatus,'pending');assert.equal(account.approvedBy,undefined);
 await assert.rejects(service.login(input,'login'),e=>e.status===403);
 for(const role of ['caregiver','social','admin'])assert.throws(()=>service.approveCaregiver({id:account.id,role},account.id),e=>e.status===403);
 assert.throws(()=>authorize(db,account,'caregivers',{}),e=>e.status===403);
 assert.throws(()=>scopedState(db,account),e=>e.status===403);
 const admin=db.accounts[0];service.approveCaregiver(admin,account.id);service.approveCaregiver(admin,account.id);
 assert.equal(db.accountApprovals.length,1);assert.equal(db.accountApprovals[0].adminId,'admin');assert.equal(db.accountApprovals[0].role,'caregiver');
 const login=await service.login(input,'approved');assert.equal(findSession(db,login.token).approvalStatus,'approved');
});
test('보호사 승인: 기존 세션과 어르신 연결 세션·코드·알림 권한 회수',()=>{
 const token='a'.repeat(64),paired='b'.repeat(64),db=ensureAuth({accounts:[{id:'legacy',role:'caregiver'}],sessions:[{userId:'legacy',role:'caregiver',hash:digest(token),expiresAt:Date.now()+60000},{userId:'legacy',role:'elder',elderId:'e',hash:digest(paired),expiresAt:Date.now()+60000}],pairCodes:[{userId:'legacy'}],wellnessDevices:[{userId:'legacy',token:'old',permission:'granted'}]});
 assert.equal(db.accounts[0].approvalStatus,'pending');assert.equal(db.sessions.length,0);assert.equal(db.pairCodes.length,0);assert.equal(findSession(db,token),null);assert.equal(findSession(db,paired),null);assert.equal(db.wellnessDevices[0].token,'');
});
test('보호사 승인: 미승인 계정 자동·수동 배정 제외',()=>{
 const now=Date.parse('2026-09-30T08:00:00+09:00'),db={accounts:[{role:'caregiver',caregiverId:'c'}],caregivers:[{id:'c',lat:37.56,lng:126.92,from:9,to:18,days:[1,2,3,4,5],services:['생활 도움']}],elders:[{id:'e',lat:37.56,lng:126.92}],requests:[]},r={id:'r',elderId:'e',service:'생활 도움',duration:60,requestedAt:now+7200000,status:'attention',events:[]};
 for(const approvalStatus of [undefined,'pending']){db.accounts[0].approvalStatus=approvalStatus;assert.equal(match(db,r,now),null);assert.throws(()=>transition(db,r,'resolve',{caregiverId:'c',start:'2026-09-30T10:00:00+09:00',note:'확인'},now));}
 db.accounts[0].approvalStatus='approved';assert.equal(match(db,r,now).caregiverId,'c');
});
