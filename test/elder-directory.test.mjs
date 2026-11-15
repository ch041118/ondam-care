import test from 'node:test';import assert from 'node:assert/strict';
import {elderSummaries,filterElders} from '../public/elder-directory.js';
import {canEditElderNotes,saveElderNotes} from '../lib/elder-notes.mjs';
import {authorize,scopedState} from '../lib/auth.mjs';
const staff={id:'s',name:'담당 복지사',role:'social',approvalStatus:'approved'};
const caregiver={id:'c-user',role:'caregiver',caregiverId:'c',approvalStatus:'approved'};
const fixture=()=>({elders:[{id:'e',name:'김가상',address:'서울 마포구',contact:'010-0000-0000',ownerCaregiverId:'c'},{id:'other',name:'박가상',address:'서울 은평구'}],caregivers:[],requests:[],checkins:[],wellnessDevices:[]});
test('어르신 목록: 이름·주소·연락처 검색과 상태 필터, 최근 기록 순서',()=>{
 const db=fixture();db.elders[0].precautions='가상 주의';db.requests=[{id:'old',elderId:'e',createdAt:1,status:'attention'},{id:'new',elderId:'e',createdAt:3,status:'confirmed'}];const rows=elderSummaries(db.elders,db.requests);
 for(const term of ['김','마포','010-0000'])assert.equal(filterElders(rows,term).length,1);
 for(const filter of ['notes','active','attention'])assert.equal(filterElders(rows,'',filter)[0].elder.id,'e');
 assert.equal(filterElders(rows,'','none')[0].elder.id,'other');assert.equal(rows[0].recent[0].id,'new');assert.equal(filterElders(rows,'없는이름').length,0);
 const many=elderSummaries(Array.from({length:3000},(_,i)=>({id:'e'+i,name:'어르신'+i})),[]);assert.equal(filterElders(many,'','none').length,3000);
});
test('주의 사항: 허용된 직원만 수정, 이전 담당자는 읽기만 가능',()=>{
 const db=fixture();assert.ok(canEditElderNotes(db,staff,'e'));assert.ok(canEditElderNotes(db,caregiver,'e'));assert.equal(canEditElderNotes(db,caregiver,'other'),false);
 assert.throws(()=>authorize(db,caregiver,'elder-notes',{id:'other'}));assert.throws(()=>authorize(db,{role:'elder',elderId:'e'},'elder-notes',{id:'e'}));
 db.elders[0].ownerCaregiverId=null;db.requests.push({id:'r',elderId:'e',caregiverId:'c',status:'confirmed'});assert.ok(canEditElderNotes(db,caregiver,'e'));db.requests[0].status='completed';assert.equal(canEditElderNotes(db,caregiver,'e'),false);
 assert.throws(()=>saveElderNotes(db,{id:'e',specialNotes:'',precautions:'',revision:0},caregiver));
});
test('주의 사항: 저장 이력·동시 수정 충돌·길이 제한·어르신 응답에서 제외',()=>{
 const db=fixture(),body={id:'e',specialNotes:'가상 생활 습관',precautions:'가상 주의',revision:0};saveElderNotes(db,body,staff,100);assert.equal(db.elders[0].notesHistory.length,1);assert.equal(db.elders[0].notesUpdatedBy,staff.name);
 assert.throws(()=>saveElderNotes(db,{...body,precautions:'덮어쓰기'},staff),e=>e.status===409);assert.equal(db.elders[0].precautions,body.precautions);
 assert.throws(()=>saveElderNotes(db,{...body,revision:1,specialNotes:'x'.repeat(3001)},staff));
 const elder=scopedState(db,{role:'elder',elderId:'e'}).elders[0];assert.equal(elder.precautions,undefined);assert.equal(elder.notesHistory,undefined);
 const visible=scopedState(db,caregiver).elders[0];assert.equal(visible.precautions,body.precautions);assert.equal(visible.notesEditable,true);assert.equal(visible.notesHistory,undefined);
});
