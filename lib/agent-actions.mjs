import { createHash, randomUUID } from 'node:crypto';
import { scopedState, authError, isStaff, canUseAgent } from './auth.mjs';
import { ACTION_TOOLS, validateToolArguments } from './agent-tools.mjs';
import { organizationOf } from './organization.mjs';
import { validateHours } from './caregivers.mjs';
import { saveElderNotes } from './elder-notes.mjs';
import { resolveCheckin } from './wellness.mjs';
import { transition } from './scheduler.mjs';

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function target(db,user,name,args){
 if(!isStaff(user)&&!(canUseAgent(user)&&name==='propose_work_hours'&&args.id===user.caregiverId))throw authError('본인의 근무 설정만 변경할 수 있습니다.',403);
 const state=scopedState(db,user),rows=name==='propose_elder_notes'?state.elders:name==='propose_checkin_resolution'?state.checkins:name==='propose_schedule_change'?state.requests:state.caregivers;
 const row=rows.find(r=>r.id===args.id);if(!row)throw authError('대상을 찾을 수 없거나 권한이 없습니다.',404);return row;
}
function applyNotes(db,user,row,args,now){
 if(args.specialNotes===undefined&&args.precautions===undefined)throw authError('변경할 특이 사항 또는 주의 사항을 입력해 주세요.');
 return saveElderNotes(db,{id:row.id,revision:row.notesRevision||0,specialNotes:args.specialNotes??row.specialNotes??'',precautions:args.precautions??row.precautions??''},user,now);
}
function validateChange(db,user,name,args,now){
 const row=target(db,user,name,args);
 if(name==='propose_elder_notes')applyNotes(structuredClone(db),user,row,args,now);
 else if(name==='propose_checkin_resolution')resolveCheckin(structuredClone(db),args,now);
 else if(name==='propose_work_hours')validateHours(args);
 else{
  if(!['pending','confirmed','attention'].includes(row.status))throw authError('진행 중인 일정만 변경할 수 있습니다.');
  if(row.voiceReview&&!row.voiceReview.resolvedAt)throw authError('녹음 해석을 먼저 완료해 주세요.');
  const caregiver=db.caregivers.find(c=>c.id===args.caregiverId);
  if(!caregiver||organizationOf(caregiver)!==organizationOf(row))throw authError('같은 기관의 보호사를 선택해 주세요.',403);
  const clone=structuredClone(db),r=clone.requests.find(r=>r.id===row.id);r.status='attention';transition(clone,r,'resolve',args,now);
 }
 return row;
}
export function prepareAgentAction(db,user,name,args,now=Date.now()){
 const definition=ACTION_TOOLS.find(t=>t.name===name);if(!definition)throw authError('지원하지 않는 변경 도구입니다.');validateToolArguments(definition,args);
 const row=validateChange(db,user,name,args,now);
 const proposal={id:randomUUID(),actorId:user.id,sessionHash:user.sessionHash||'',name,args:structuredClone(args),beforeHash:hash(row),createdAt:now,expiresAt:now+10*60000,status:'pending',summary:name==='propose_elder_notes'?row.name+' 어르신 기록 변경\n'+['specialNotes','precautions'].filter(k=>args[k]!==undefined).map(k=>(k==='specialNotes'?'특이 사항':'주의 사항')+': '+(row[k]||'(없음)')+' → '+(args[k]||'(삭제)')).join('\n'):name==='propose_checkin_resolution'?db.elders.find(e=>e.id===row.elderId)?.name+' 어르신 안부 확인 완료\n연락 결과·조치: '+args.note:name==='propose_schedule_change'?`${row.service} · ${db.elders.find(e=>e.id===row.elderId)?.name} / ${new Date(row.start||now).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} → ${new Date(args.start).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} / ${db.caregivers.find(c=>c.id===args.caregiverId)?.name} 보호사에게 재신청`: `${row.name} 보호사 근무: ${row.days.map(d=>'일월화수목금토'[d]).join('·')}요일 ${row.from}–${row.to}시 → ${args.days.map(d=>'일월화수목금토'[d]).join('·')}요일 ${args.from}–${args.to}시 (기존 예약 유지)`};
 db.agentProposals=(db.agentProposals||[]).filter(p=>p.expiresAt>now-86400000);db.agentProposals.push(proposal);
 return {proposalId:proposal.id,summary:proposal.summary,expiresAt:proposal.expiresAt,requiresConfirmation:true};
}
export function confirmAgentAction(db,user,{proposalId,decision},now=Date.now()){
 if(!['confirm','cancel'].includes(decision))throw authError('변경 확인 여부를 선택해 주세요.');
 const p=(db.agentProposals||[]).find(p=>p.id===proposalId);
 if(!p||p.actorId!==user.id||p.sessionHash!==(user.sessionHash||''))throw authError('현재 대화에서 제안한 변경만 확인할 수 있습니다.',403);
 target(db,user,p.name,p.args);
 if(p.status==='executed')return {executed:true,id:p.args.id,alreadyApplied:true};
 if(p.status!=='pending'||p.expiresAt<=now)throw authError('변경안이 취소되었거나 만료됐습니다. 다시 요청해 주세요.',409);
 if(decision==='cancel'){p.status='cancelled';return {cancelled:true};}
 const row=validateChange(db,user,p.name,p.args,now);
 if(hash(row)!==p.beforeHash)throw authError('대상 정보가 바뀌었습니다. 최신 내용으로 변경안을 다시 만들어 주세요.',409);
 if(p.name==='propose_elder_notes')applyNotes(db,user,row,p.args,now);
 else if(p.name==='propose_checkin_resolution')resolveCheckin(db,p.args,now);
 else if(p.name==='propose_work_hours')Object.assign(db.caregivers.find(c=>c.id===p.args.id),validateHours(p.args));
 else{const r=db.requests.find(r=>r.id===p.args.id);r.status='attention';transition(db,r,'resolve',p.args,now);delete r.elderAcknowledgedAt;}
 p.status='executed';p.executedAt=now;
 db.agentAudit||=[];db.agentAudit.push({id:p.id,actorId:user.id,organizationId:organizationOf(p.name==='propose_checkin_resolution'?db.elders.find(e=>e.id===row.elderId):row),at:now,action:p.name,args:p.args,summary:p.summary});
 return {executed:true,id:p.args.id,message:p.name==='propose_elder_notes'?'특이·주의 사항을 저장했습니다.':p.name==='propose_checkin_resolution'?'연락 결과를 기록하고 안부 확인을 완료했습니다.':p.name==='propose_work_hours'?'근무 설정을 변경했습니다. 기존 예약은 유지됩니다.':'변경한 일정으로 재신청했습니다. 보호사 수락 후 확정됩니다.'};
}
