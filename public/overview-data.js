const DAY=86400000;
export function completionTime(request){
 if(Number.isFinite(request.completedAt))return request.completedAt;
 const recorded=(request.events||[]).filter(e=>Number.isFinite(e.at)&&/돌봄을 완료/.test(e.message||'')).map(e=>e.at);
 if(recorded.length)return Math.max(...recorded);
 if(Number.isFinite(request.start)&&Number.isFinite(request.duration))return request.start+request.duration*60000;
 return request.createdAt;
}
export function overviewRequests(requests,now=Date.now()){
 const today=new Date(now+9*3600000).toISOString().slice(0,10);
 const cutoff=Date.parse(today+'T00:00:00+09:00')-2*DAY;
 return requests.filter(r=>r.urgency!=='sos'&&r.urgency!=='emergency'&&!['draft','cancelled'].includes(r.status)&&(r.status!=='completed'||(completionTime(r)>=cutoff&&completionTime(r)<=now)));
}
