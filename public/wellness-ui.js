export function createWellnessUI({api,getState,refresh,drawer,close,speak,escape:esc,formatTime:fmt,isRecording}) {
  const labels={waiting:'답변 기다리는 중',escalated:'무응답 · 확인 필요',delivery_failed:'알림 전송 확인 필요',responded:'안부 응답 완료',review:'답변 확인 필요',resolved:'담당자 확인 완료',skipped:'오늘 활동 확인 · 안부 생략',cancelled:'알림 중단'};
  let lastPrompt='',quietUntil=0,activityPending=false;
  const attention=c=>c.attentionAt&&!c.resolvedAt;
  const waiting=c=>!c.respondedAt&&!c.resolvedAt&&['waiting','escalated','delivery_failed'].includes(c.status);
  const elder=id=>getState().elders.find(e=>e.id===id);
  const day=t=>new Date(t+9*3600000).toISOString().slice(0,10);
  const state=()=>getState();
  const policy=()=>state().wellnessSettings||{enabled:true,hour:19,minute:0,maxAttempts:3};
  const counts=()=> (state().checkins||[]).filter(attention).length;
  function current(){
    if(!location.hash.startsWith('#elder/'))return null;
    const elderId=location.hash.split('/')[1],preview=sessionStorage.getItem('clover.wellness.preview');
    return (state().checkins||[]).find(c=>c.elderId===elderId&&waiting(c)&&(!c.simulation||c.id===preview))||null;
  }
  function panel(){
    const settings=policy(),list=[...(state().checkins||[])].sort((a,b)=>Number(Boolean(attention(b)))-Number(Boolean(attention(a)))||b.createdAt-a.createdAt);
    const used=state().elders.filter(e=>e.lastActiveAt&&day(e.lastActiveAt)===day(Date.now())).length;
    return `<div class="page-heading"><div><div class="eyebrow">A LITTLE HELLO, EVERY DAY</div><h1>오늘의 안부</h1><p class="subtitle">오늘 만나지 못한 어르신에게, 다정하게 안부를 여쭤요.</p></div><button class="btn" data-wellness="settings">안부 알림 설정</button></div><div class="metrics"><div class="metric"><div class="metric-top">오늘 앱을 사용한 어르신</div><div class="metric-value">${used}<span>명</span></div><div class="metric-foot">직접 앱을 열거나 요청한 기록</div></div><div class="metric"><div class="metric-top">오늘 안부 답변</div><div class="metric-value">${list.filter(c=>!c.simulation&&c.respondedAt&&day(c.respondedAt)===day(Date.now())).length}<span>명</span></div><div class="metric-foot">미응답과 답변 내용을 구분해요</div></div><div class="metric warn"><div class="metric-top">담당자 확인 필요</div><div class="metric-value">${counts()}<span>건</span></div><div class="metric-foot">무응답 · 발송 실패 · 답변 확인</div></div><div class="metric"><div class="metric-top">매일 안부 시간</div><div class="metric-value">${String(settings.hour).padStart(2,'0')}:${String(settings.minute).padStart(2,'0')}</div><div class="metric-foot">${settings.enabled?`5분 간격 · 총 ${settings.maxAttempts}회`:'자동 안부 확인 꺼짐'}</div></div></div><div class="notice">${state().demo?'기기 내 체험 모드입니다. 아래 체험만 동작하며 앱을 닫으면 자동 알림이 발송되지 않습니다.':'앱을 닫아도 서버가 확인합니다. 실제 푸시는 서버와 기기의 알림 설정이 필요합니다.'} 마지막 알림 후에도 5분 동안 기다린 뒤 담당자에게 확인을 요청합니다.</div><div class="actions" style="margin-bottom:20px"><button class="btn primary" data-wellness="demo">안부 확인 흐름 체험</button>${window.CloverNative?'<button class="btn" data-wellness="push">이 기기 푸시 알림 연결</button>':''}</div><section class="panel panel-pad"><div class="panel-title"><h2>확인 목록과 안부 기록</h2><span class="muted">${list.length}건</span></div>${list.length?list.slice(0,40).map(c=>`<article class="wellness-row"><div><strong>${esc(elder(c.elderId)?.name||'어르신')} 어르신</strong> <span class="pill ${attention(c)?'attention':''}">${labels[c.status]}</span>${c.simulation?' <span class="pill">체험</span>':''}<p>${esc(c.reason||c.response||`${c.attempts.length} / ${c.policy.maxAttempts}회 알림`)}<br><small>${esc(c.day)} · ${c.nextAt?`다음 확인 ${fmt(c.nextAt)}`:fmt(c.respondedAt||c.resolvedAt||c.createdAt)}</small></p></div><button class="btn" data-wellness="detail" data-id="${esc(c.id)}">기록 확인</button></article>`).join(''):'<div class="empty">아직 안부 확인 기록이 없어요.<br>저녁 안부 시간이 되면 확인을 시작합니다.</div>'}</section><section class="panel panel-pad" style="margin-top:20px"><h2>알림 받을 기기</h2><p class="subtitle">${window.CloverNative?.pushStatus||'어르신과 사회복지사 기기에서 알림을 허용하고 서버에 연결해 주세요.'}</p>${(state().wellnessDevices||[]).map(d=>`<p class="subtitle">${d.role==='elder'?esc(elder(d.elderId)?.name||'어르신')+' 어르신':d.role==='social'?'사회복지사':'요양보호사'} · ${d.platform==='ios'?'iPhone':'Android'} · ${d.permission==='granted'?'푸시 등록됨':'알림 연결 확인 필요'}</p>`).join('')||'<p class="subtitle">등록된 푸시 기기가 없습니다.</p>'}${(state().wellnessOutbox||[]).filter(j=>j.kind==='staff'&&j.status==='failed').length?'<div class="notice amber">담당자 푸시가 전송되지 않은 기록이 있습니다. 이 화면의 확인 목록은 유지됩니다.</div>':''}</section>`;
  }
  function settings(){const s=policy();drawer('안부 알림 설정',`<form id="wellness-settings"><label for="wellness-enabled">매일 안부 확인</label><select id="wellness-enabled" name="enabled"><option value="true" ${s.enabled?'selected':''}>사용</option><option value="false" ${!s.enabled?'selected':''}>잠시 중단</option></select><label for="wellness-time">이른 저녁 시간 · 한국 시간</label><input id="wellness-time" name="time" type="time" min="17:00" max="21:59" value="${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')}" required><label for="wellness-count">총 알림 횟수</label><select id="wellness-count" name="count">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===s.maxAttempts?'selected':''}>${n}회</option>`).join('')}</select><div class="notice">5분 간격은 고정입니다. 마지막 알림 후 5분이 지나도 응답이 없으면 사회복지사에게 확인을 요청합니다. 변경 내용은 새로 시작하는 안부 확인부터 적용됩니다. 중단 시 진행 중 재알림도 중단합니다.</div><button class="btn primary" type="submit">저장하기</button></form>`);}
  function detail(id){const c=(state().checkins||[]).find(c=>c.id===id);if(!c)return;drawer('안부 확인 기록',`<h2>${esc(elder(c.elderId)?.name)} 어르신</h2><div class="notice ${attention(c)?'amber':''}">${labels[c.status]}${c.simulation?' · 체험 기록':''}<br>${esc(c.reason||c.response||(c.skipReason==='care-request'?'오늘 돌봄을 요청하여 출석·안부 확인을 생략했습니다.':'짧은 안부 답변을 기다리고 있어요.'))}</div><p class="subtitle">알림 ${c.attempts.length} / ${c.policy.maxAttempts}회 · 간격 5분<br>${c.response?`어르신 답변: ${esc(c.response)}`:''}</p><div class="actions">${c.simulation&&c.status==='waiting'?`<button class="btn" data-wellness="next" data-id="${esc(id)}">5분 경과 체험</button>`:''}${c.simulation&&waiting(c)?`<button class="btn" data-wellness="preview" data-id="${esc(id)}">어르신 응답 화면 체험</button>`:''}</div>${attention(c)?`<form id="wellness-resolve" data-id="${esc(id)}"><label for="wellness-note">직접 연락한 결과와 조치</label><textarea id="wellness-note" name="note" required maxlength="1000" placeholder="예: 전화로 안부 확인. 휴대폰이 무음 상태였음."></textarea><button class="btn primary" type="submit">확인 완료</button></form>`:''}<ol class="timeline">${c.events.map(e=>`<li><p>${esc(e.message)}</p><small>${fmt(e.at)}</small></li>`).join('')}</ol>`);}
  async function activity(){
    if(current()?.simulation)return;
    if(activityPending||!location.hash.startsWith('#elder/')||document.visibilityState==='hidden')return;
    if(window.CloverNative&&window.CloverNative.config.role!=='elder')return;
    activityPending=true;
    try{await api('wellness/activity',{elderId:location.hash.split('/')[1]});}catch{}finally{activityPending=false;}
  }
  function renderElder(){
    const holder=document.getElementById('wellness-elder');if(!holder)return false;
    const c=current();
    if(!c){if(holder.dataset.case){const title=document.querySelector('.elder h1');if(title)title.innerHTML=esc(elder(location.hash.split('/')[1])?.name)+' 어르신,<br>무엇을 도와드릴까요?';const guide=document.getElementById('mic-guide');if(guide)guide.textContent='아래 마이크를 꾹 누르고 편하게 말씀해 주세요.';}holder.innerHTML='';delete holder.dataset.case;return Date.now()<quietUntil;}
    const tag=`${c.id}:${c.status}:${c.attempts.length}`;
    if(holder.dataset.case!==c.id){holder.dataset.case=c.id;holder.innerHTML=`<button class="wellness-okay" data-wellness="reply" data-id="${esc(c.id)}">네, 잘 지내요</button>`;}
    const title=document.querySelector('.elder h1');if(title)title.innerHTML='오늘 하루는<br>어떠셨어요?';
    const guide=document.getElementById('mic-guide');if(guide)guide.textContent='잘 지내시면 위 버튼을 누르거나 마이크로 말씀해 주세요.';
    if(lastPrompt!==tag){lastPrompt=tag;const text=c.simulation?'안부 확인 체험이에요. 잘 지내시면 버튼을 눌러 주세요.':'저녁은 드셨어요? 오늘 하루는 어떠셨나요? 편하게 안부를 들려주세요.';document.getElementById('voice-result').textContent='편하게 안부를 들려주세요.';speak(text);}
    return true;
  }
  async function received(result){
    if(!result?.checkin)return false;
    quietUntil=Date.now()+60000;
    await window.CloverNative?.clearCheckinNotifications?.(result.checkin.id);
    renderElder();
    return true;
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-wellness]');if(!button)return;
    const action=button.dataset.wellness,id=button.dataset.id;
    try{
      if(action==='settings')return settings();if(action==='detail')return detail(id);
      if(action==='preview'){const c=state().checkins.find(c=>c.id===id);sessionStorage.setItem('clover.wellness.preview',id);close();location.hash=`elder/${c.elderId}`;return;}
      if(action==='demo'){drawer('안부 확인 체험',`<form id="wellness-demo"><label for="wellness-demo-elder">어르신</label><select id="wellness-demo-elder" name="elderId">${state().elders.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select><div class="notice">실제 푸시는 보내지 않습니다. 버튼으로 5분씩 진행하며 미응답과 답변 처리를 확인할 수 있어요.</div><button class="btn primary" type="submit">첫 안부 알림 체험</button></form>`);return;}
      button.disabled=true;
      if(action==='push'){await window.CloverNative?.enablePush?.();await refresh();return;}
      if(action==='next'){await api('wellness/demo',{id});await refresh();detail(id);}
      if(action==='reply'){
        if(isRecording?.()||window.CloverNative?.busy){button.disabled=false;return;}
        const c=state().checkins.find(c=>c.id===id);
        const result=await api('wellness/reply',{id,elderId:c.elderId,outcome:'okay',text:'네, 잘 지내요'});
        await refresh();await received({checkin:result});
        const text='답해 주셔서 고마워요.\n편안한 저녁 보내세요.';document.getElementById('voice-result').textContent=text;speak(text);
      }
    }catch(error){if(location.hash.startsWith('#elder/')){document.getElementById('voice-result').textContent='답변을 보내지 못했어요.\n연결을 확인하고 다시 눌러 주세요.';}else alert(error.message);button.disabled=false;}
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!['wellness-settings','wellness-demo','wellness-resolve'].includes(form.id))return;event.preventDefault();
    const body=Object.fromEntries(new FormData(form)),button=form.querySelector('[type="submit"]');button.disabled=true;
    try{let result;
      if(form.id==='wellness-settings'){const [hour,minute]=body.time.split(':').map(Number);await api('wellness/settings',{enabled:body.enabled==='true',hour,minute,maxAttempts:Number(body.count)});}
      if(form.id==='wellness-demo')result=await api('wellness/demo',body);
      if(form.id==='wellness-resolve')result=await api('wellness/resolve',{id:form.dataset.id,note:body.note});
      await refresh();close();if(result)detail(result.id);
    }catch(error){alert(error.message);button.disabled=false;}
  });
  for(const eventName of ['pointerdown','keydown'])document.addEventListener(eventName,event=>{if(event.target.closest('.elder'))void activity();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void activity();});
  window.addEventListener('clover-foreground',()=>{void activity();});
  return {panel,counts,current,renderElder,activity,received};
}
