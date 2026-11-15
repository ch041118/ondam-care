import { randomUUID } from 'node:crypto';
import { SERVICES, match, event } from './scheduler.mjs';
import { organizationOf, supportedRequest } from './organization.mjs';

const failure=(message,status=400)=>Object.assign(Error(message),{status});
export const revisionOf = r => r.revision || 0;
const revised = r => {r.revision=revisionOf(r)+1;};

export function createRequestDraft(db, input, now=Date.now()) {
  const elder=db.elders.find(e=>e.id===input.elderId);
  if(!elder||!SERVICES.includes(input.service))throw failure('어르신과 돌봄 종류를 확인해 주세요.');
  const previous=db.requests.find(r=>r.elderId===input.elderId&&r.status==='draft');
  if(previous){previous.status='cancelled';revised(previous);event(previous,'어르신','새 말씀으로 이전 확인 대기 내용을 대체했습니다.');}
  const r={id:randomUUID(),organizationId:organizationOf(elder),elderId:elder.id,service:input.service,requestedAt:input.requestedAt??null,requestedTimeText:String(input.requestedTimeText||'').slice(0,4000),timeNeedsReview:input.timeNeedsReview===true,needsReview:input.needsReview===true,requestReviewReason:String(input.requestReviewReason||input.timeReviewReason||'').slice(0,400),transcript:String(input.transcript||input.summary||input.service).slice(0,4000),duration:60,createdAt:now,status:'draft',revision:0,events:[]};
  event(r,'시스템','말씀하신 내용을 확인해 주세요. 확인 전에는 배정하지 않습니다.');
  db.requests.unshift(r);return r;
}

export function requestFeedback(db, user, input, now=Date.now()) {
  const r=db.requests.find(r=>r.id===input.id&&supportedRequest(r));
  if(!r)throw failure('요청을 찾을 수 없습니다.',404);
  if(user.role!=='elder'||user.elderId!==r.elderId)throw failure('본인의 요청만 확인할 수 있습니다.',403);
  if(!Number.isInteger(input.revision)||input.revision!==revisionOf(r))throw failure('내용이 변경되었습니다. 최신 내용을 다시 확인해 주세요.',409);
  const action=input.action;
  if(action==='confirm'&&r.status==='draft'){
    if(r.requestedAt!=null&&(!Number.isFinite(r.requestedAt)||r.requestedAt<now))throw failure('희망 시간이 지났어요. 내용을 수정해 주세요.');
    if(db.requests.some(x=>x.id!==r.id&&x.elderId===r.elderId&&x.service===r.service&&['pending','confirmed','attention'].includes(x.status)&&now-(x.submittedAt||x.createdAt)<60000))throw failure('방금 같은 요청을 접수했어요. 내 일정에서 확인해 주세요.',409);
    r.status='pending';r.submittedAt=now;r.contentConfirmedAt=now;
    event(r,'어르신','요청 내용을 확인하고 접수했습니다.');
    const assignment=r.needsReview?null:match(db,r,now);
    if(assignment){Object.assign(r,assignment);event(r,'자동 배정','가능한 보호사에게 신청했습니다. 보호사 수락 전까지 미확정입니다.');}
    else{r.status='attention';r.reason=r.requestReviewReason||'가능한 일정 또는 요청 내용을 담당자가 확인해야 합니다.';event(r,'시스템',r.reason);}
  }else if(action==='correct'&&r.status==='draft'){
    if(!SERVICES.includes(input.service))throw failure('돌봄 종류를 선택해 주세요.');
    if(input.requestedAt!==null&&(!Number.isFinite(input.requestedAt)||input.requestedAt<now))throw failure('앞으로의 시간을 선택해 주세요.');
    r.service=input.service;r.requestedAt=input.requestedAt;r.requestedTimeText=input.requestedAt?new Date(input.requestedAt).toISOString():'';
    // A human review flag cannot be cleared just by changing a dropdown.
    r.timeNeedsReview=false;r.needsReview=r.needsReview||Boolean(r.requestReviewReason);
    event(r,'어르신','요청 내용을 수정했습니다. 다시 확인하면 접수됩니다.');
  }else if(action==='cancel'&&r.status==='draft'){
    r.status='cancelled';event(r,'어르신','확인 대기 중인 요청을 취소했습니다.');
  }else if(action==='acknowledge'&&r.status==='confirmed'){
    r.elderAcknowledgedAt=now;event(r,'어르신','확정된 담당자·시간·돌봄 내용을 확인했습니다.');
  }else if(action==='request-change'&&['pending','confirmed'].includes(r.status)){
    if(typeof input.note!=='string'||!input.note.trim()||input.note.length>1000)throw failure('바꾸고 싶은 내용을 입력해 주세요.');
    r.changeRequest={note:input.note.trim(),at:now,status:'pending'};
    event(r,'어르신',`일정 변경 요청: ${r.changeRequest.note} (담당자 조율 전까지 기존 일정 유지)`);
  }else throw failure('현재 상태에서는 처리할 수 없습니다.',409);
  revised(r);return r;
}
