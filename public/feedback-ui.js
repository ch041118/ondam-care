const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const services=['생활 도움','병원 동행','식사 도움','외출 동행'];
export function feedbackButtons(r){
 const attrs=`data-feedback-id="${esc(r.id)}" data-revision="${r.revision||0}"`;
 if(r.status==='draft')return `<div class="elder-feedback-actions"><button class="btn primary" data-feedback="confirm" ${attrs}>맞아요 · 요청 보내기</button><button class="btn" data-feedback="correct" ${attrs}>아니에요 · 수정하기</button><button class="btn" data-feedback="cancel" ${attrs}>취소</button></div>`;
 if(r.status==='confirmed')return `<div class="elder-feedback-actions">${r.elderAcknowledgedAt?'<p class="acknowledged">확정 내용을 확인하셨어요 ✓</p>':`<button class="btn primary" data-feedback="acknowledge" ${attrs}>맞아요 · 일정 확인</button>`}${r.changeRequest?.status==='pending'?'':`<button class="btn" data-feedback="request-change" ${attrs}>바꾸고 싶어요</button>`}</div>`;
 if(r.status==='pending'&&r.changeRequest?.status!=='pending')return `<button class="btn" data-feedback="request-change" ${attrs}>내용 수정 요청</button>`;
 return '';
}
export function draftMarkup(state,elderId,fmt){const r=state.requests.find(r=>r.elderId===elderId&&r.status==='draft');return r?`<section class="elder-draft" aria-label="요청 내용 확인"><span class="pill">접수 전 · 내용 확인</span><h2>이렇게 부탁하신 게 맞나요?</h2><p class="draft-service">${esc(r.service)}</p><p>${r.timeNeedsReview?esc(r.requestedTimeText||'시간은 담당자와 확인할게요'):r.requestedAt?fmt(r.requestedAt):'가능한 빠른 시간'}</p><p class="draft-transcript">들은 말씀: ${esc(r.transcript)}</p>${r.needsReview?'<p>접수 후 담당 선생님이 내용을 한 번 더 확인해요.</p>':''}${feedbackButtons(r)}</section>`:'';}
export function bindFeedback({getState,api,refresh,drawer,close,toast,speak}){
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-feedback]');if(!button)return;
  const {feedback:action,feedbackId:id,revision}=button.dataset,r=getState().requests.find(r=>r.id===id);if(!r)return;
  if(action==='correct'){
   const date=r.requestedAt?new Date(r.requestedAt+9*3600000).toISOString().slice(0,16):'';
   drawer('부탁 내용 수정',`<form id="request-feedback-form" data-action="correct" data-id="${esc(id)}" data-revision="${revision}"><label>필요한 도움<select name="service">${services.map(s=>`<option ${s===r.service?'selected':''}>${s}</option>`).join('')}</select></label><label>원하는 날짜와 시간<input type="datetime-local" name="requestedAt" value="${date}"></label><p>비워두면 가능한 빠른 시간을 찾아요. 수정 후 다시 확인하면 요청을 보내요.</p><button class="btn primary" type="submit">수정한 내용 확인하기</button><p data-feedback-error role="alert"></p></form>`);return;
  }
  if(action==='request-change'){
   drawer('바꾸고 싶은 내용',`<form id="request-feedback-form" data-action="request-change" data-id="${esc(id)}" data-revision="${revision}"><label>무엇을 바꾸고 싶으세요?<textarea name="note" required maxlength="1000" placeholder="예: 오후 2시 대신 3시에 와 주세요."></textarea></label><p>담당자가 확인하기 전까지 기존 일정이 유지돼요.</p><button class="btn primary" type="submit">변경 요청 보내기</button><p data-feedback-error role="alert"></p></form>`);return;
  }
  button.disabled=true;try{await api('request-feedback',{id,action,revision:Number(revision)});await refresh();const text=action==='confirm'?'요청을 접수했어요. 내 일정에서 진행 상태를 확인해 주세요.':action==='acknowledge'?'확인해 주셔서 고마워요.':'요청을 취소했어요.';toast(text);speak(text);}catch(error){toast(error.message);button.disabled=false;}
 });
 document.addEventListener('submit',async event=>{
  const form=event.target;if(form.id!=='request-feedback-form')return;event.preventDefault();const values=Object.fromEntries(new FormData(form)),button=form.querySelector('button');button.disabled=true;
  try{await api('request-feedback',{id:form.dataset.id,action:form.dataset.action,revision:Number(form.dataset.revision),...(form.dataset.action==='correct'?{service:values.service,requestedAt:values.requestedAt?Date.parse(values.requestedAt+':00+09:00'):null}:{note:values.note})});close();await refresh();toast(form.dataset.action==='correct'?'수정한 내용을 확인하고 요청을 보내 주세요.':'변경 요청을 남겼어요. 담당자가 확인할게요.');}catch(error){form.querySelector('[data-feedback-error]').textContent=error.message;button.disabled=false;}
 });
}
