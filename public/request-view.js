import {overviewRequests} from './overview-data.js';
export const requestViews={draft:'내용 확인 중',cancelled:'취소된 요청',change_requested:'변경 요청',received:'접수된 돌봄',confirmed:'일정 확정',pending:'수락 대기',attention:'조율이 필요한 요청',completed:'돌봄 완료'};
export function selectRequests(requests,{status='',history=false,caregiverId,term='',elders=[],now=Date.now()}={}){
 let rows=requests.filter(r=>r.urgency!=='sos'&&r.urgency!=='emergency');
 if(history)rows=rows.filter(r=>r.status==='completed');
 else if(status==='change_requested')rows=rows.filter(r=>r.changeRequest?.status==='pending');
 else if(status==='received')rows=rows.filter(r=>['pending','confirmed','attention'].includes(r.status));
 else if(status==='completed')rows=overviewRequests(rows,now).filter(r=>r.status==='completed');
 else if(Object.prototype.hasOwnProperty.call(requestViews,status))rows=rows.filter(r=>r.status===status);
 if(caregiverId)rows=rows.filter(r=>r.caregiverId===caregiverId);
 if(term)rows=rows.filter(r=>elders.find(e=>e.id===r.elderId)?.name.includes(term));
 return rows;
}
export const initialRoute=user=>user?.role==='elder'?'elder/'+encodeURIComponent(user.elderId):user?.role==='caregiver'?'timetable':user?.role==='social'||user?.role==='admin'?'assistant':'overview';

// Keep only routes available to the signed-in role; never restore an elder route for staff.
export function resumeRoute(user,hash=''){
 if(user?.role==='elder')return initialRoute(user);
 const route=hash.replace(/^#/,''),page=route.split('?')[0];
 const allowed=['assistant','timetable','overview','requests','caregivers','elders','history',...(['social','admin'].includes(user?.role)?['wellness']:[])];
 return allowed.includes(page)?route:initialRoute(user);
}
