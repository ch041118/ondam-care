import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone} from '../lib/phone.mjs';
import {ensureAuth,authorize,scopedState} from '../lib/auth.mjs';
import {createWellnessWorker} from '../lib/wellness-worker.mjs';
import {ensureWellness} from '../lib/wellness.mjs';
import {match,transition} from '../lib/scheduler.mjs';
import {elderHelp} from '../public/elder-help.js';
test('종료한 기능: 권한·화면·조회·배정·알림에서 제외하고 기존 기록은 보존',async()=>{
 const db=ensureAuth(ensureWellness({elders:[{id:'e',wellnessEnabled:false}],caregivers:[],requests:[{id:'legacy',elderId:'e',urgency:'sos',status:'attention'}],wellnessOutbox:[{id:'job',kind:'sos',status:'pending'}]}));
 for(const user of [{id:'a',role:'admin'},{role:'elder',elderId:'e'}]){for(const path of ['sos','sos/resolve'])assert.throws(()=>authorize(db,user,path,{id:'legacy',elderId:'e'}));assert.equal(scopedState(db,user).requests.length,0);}
 assert.equal(elderHelp(),'');assert.equal(match(db,db.requests[0]),null);assert.throws(()=>transition(db,db.requests[0],'resolve',{}));
 let sent=0;await createWellnessWorker({getDb:()=>db,save:()=>{},send:async()=>{sent++;return {ok:true};}})();assert.equal(sent,0);assert.equal(db.wellnessOutbox[0].status,'cancelled');assert.equal(db.requests.length,1);
});
test('일반 보호사 연락처 검증 유지',()=>{assert.equal(normalizePhone('010-1234-5678'),'01012345678');for(const value of ['javascript:alert(1)','119','01012345678;123','<img>',123])assert.throws(()=>normalizePhone(value));});
