import test from 'node:test';
import assert from 'node:assert/strict';
import {updateCaregiverProfile} from '../lib/caregiver-update.mjs';

const profile=()=>({id:'c1',name:'가상 보호사',phone:'',address:'이전 주소',lat:37,lng:127,days:[1],from:9,to:18,services:['생활 도움']});
const form=()=>({...profile(),address:'새 주소',from:10});
function fixture(){
 let db={caregivers:[profile()],accounts:[],requests:[]},saved;
 const commit=fn=>{const next=structuredClone(db),result=fn(next);saved=structuredClone(next);db=next;return result;};
 return {getDb:()=>db,commit,get saved(){return saved;}};
}
function pending(){let resolve;return {promise:new Promise(r=>resolve=r),resolve:v=>resolve(v)};}

test('근무 수정: 주소 조회 중 다른 저장이 끝나도 두 변경을 모두 보존한다',async()=>{
 const f=fixture(),lookup=pending();
 const result=updateCaregiverProfile(f,form(),{geocode:()=>lookup.promise});
 f.commit(db=>{db.accounts.push({id:'new-account'});db.requests.push({id:'new-request'});});
 lookup.resolve({lat:36,lng:128});
 assert.equal((await result).from,10);
 assert.equal(f.getDb().caregivers[0].address,'새 주소');
 assert.equal(f.getDb().accounts[0].id,'new-account');assert.equal(f.getDb().requests[0].id,'new-request');
 assert.deepEqual(f.saved,f.getDb());
});
test('근무 수정: 두 기기의 동시 편집은 늦은 응답으로 덮어쓰지 않는다',async()=>{
 const f=fixture(),lookup=pending(),result=updateCaregiverProfile(f,form(),{geocode:()=>lookup.promise});
 f.commit(db=>{db.caregivers[0].from=12;});lookup.resolve({lat:36,lng:128});
 await assert.rejects(result,e=>e.status===409);assert.equal(f.getDb().caregivers[0].from,12);
});
test('근무 수정: 주소 확인 중 로그아웃하면 수정하지 않는다',async()=>{
 const f=fixture(),lookup=pending();let allowed=true;
 const result=updateCaregiverProfile({...f,authorize:()=>{if(!allowed)throw Object.assign(Error('로그인 필요'),{status:401});}},form(),{geocode:()=>lookup.promise});
 allowed=false;lookup.resolve({lat:36,lng:128});await assert.rejects(result,e=>e.status===401);
 assert.deepEqual(f.getDb().caregivers,[profile()]);
});
test('근무 수정: 저장 장치 오류와 주소 조회 실패는 기존 정보에 영향을 주지 않는다',async()=>{
 const f=fixture();
 await assert.rejects(updateCaregiverProfile({...f,commit:fn=>{fn(structuredClone(f.getDb()));throw Error('저장 실패');}},form(),{geocode:async()=>({lat:36,lng:128})}),/저장 실패/);
 await assert.rejects(updateCaregiverProfile(f,form(),{geocode:async()=>{throw Error('주소 실패');}}),/주소 실패/);
 assert.deepEqual(f.getDb().caregivers,[profile()]);
});
