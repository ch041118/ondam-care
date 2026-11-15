import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationConsent} from '../lib/consent.mjs';
import {maskName,maskAddress} from '../public/privacy.js';
import {createAuthService,ensureAuth} from '../lib/auth.mjs';
import {interpretText} from '../lib/integrations.mjs';
test('동의 누락·구버전·문자열 true·대리 권한 미확인은 거부한다',()=>{
 for(const consent of [undefined,{version:'old',personal:true},{version:'2026-10-02',personal:'true'}])assert.throws(()=>registrationConsent({consent}));
 assert.throws(()=>registrationConsent({consent:{version:'2026-10-02',personal:true}},{proxyRequired:true}));
 assert.deepEqual(registrationConsent({consent:{version:'2026-10-02',personal:true,authority:true,recordedAt:1}},{proxyRequired:true,now:42}),{version:'2026-10-02',personal:true,authority:true,recordedAt:42});
});
test('동의 없는 가입은 주소 전송·계정 저장 전에 차단하고 동의 시점을 서버에 기록한다',async()=>{
 const db=ensureAuth({accounts:[],elders:[],caregivers:[],requests:[]});let geocoded=0;
 const auth=createAuthService({getDb:()=>db,commit:f=>f(db),clock:()=>1234,geocode:async()=>{geocoded++;return {lat:37,lng:127};}});
 const body={role:'elder',name:'가상',email:'consent@example.test',password:'Synthetic-only-2026!',address:'가상 주소',contact:'010-0000-0000'};
 await assert.rejects(auth.register(body,'test'));assert.equal(geocoded,0);assert.equal(db.accounts.length,0);
 await auth.register({...body,consent:{version:'2026-10-02',personal:true,authority:true}},'test');assert.equal(db.accounts[0].consent.recordedAt,1234);
});
test('목록 마스킹은 짧은 주소·이름도 노출하지 않는다',()=>{
 assert.equal(maskName('김영자'),'김**');assert.equal(maskName('김'),'*');
 assert.equal(maskAddress('서울특별시 마포구 성미산로 123 401호'),'서울특별시 마포구 · 상세주소 숨김');
 assert.equal(maskAddress('비밀주소'),'주소 숨김');
});
test('빈 입력·긴 입력은 모델 호출 전에 설명 가능한 오류로 거부한다',async()=>{
 for(const text of ['', '  ',null,'가'.repeat(4001)])await assert.rejects(interpretText(text));
});
