import { localTime, seoulDay } from './scheduler.mjs';
export function seed() {
  const today = seoulDay(Date.now()), tomorrow = seoulDay(Date.now() + 86400000);
  const caregivers = [
    { id: 'c1', name: '김은영', initials: '은영', lat: 37.5668, lng: 126.919, from: 9, to: 18, days: [1,2,3,4,5], services: ['생활 도움','병원 동행','식사 도움','외출 동행'] },
    { id: 'c2', name: '박정숙', initials: '정숙', lat: 37.563, lng: 126.925, from: 8, to: 20, days: [0,1,2,3,4,5,6], services: ['생활 도움','식사 도움','외출 동행'] },
    { id: 'c3', name: '이선희', initials: '선희', lat: 37.558, lng: 126.931, from: 10, to: 19, days: [1,2,3,4,5,6], services: ['병원 동행','생활 도움','외출 동행'] }
  ];
  const elders = [
    { id: 'e1', name: '김영자', address: '서울 마포구 연남동 (시연 주소)', lat: 37.566, lng: 126.922, contact: '010-0000-0000' },
    { id: 'e2', name: '이정호', address: '서울 마포구 서교동 (시연 주소)', lat: 37.554, lng: 126.921, contact: '010-0000-0000' },
    { id: 'e3', name: '박순자', address: '서울 마포구 성산동 (시연 주소)', lat: 37.565, lng: 126.911, contact: '010-0000-0000' }
  ];
  const make = (id, elderId, service, status, caregiverId, start, reason) => ({ id, elderId, service, status, caregiverId, start, requestedAt: start, duration: 60, transcript: `${service} 부탁해요.`, reason, createdAt: Date.now(), demo: true, events: [{at:Date.now()-3600000, actor:'자동 배정', message:'가능한 보호사를 찾아 일정을 신청했습니다.'}, {at:Date.now()-1800000, actor:status==='attention'?'요양보호사':'시스템', message: reason || (status==='completed'?'돌봄을 완료했습니다.':'보호사가 일정을 수락했습니다.')}] });
  return { caregivers, elders, requests: [
    make('r1','e2','병원 동행','attention','c1',localTime(tomorrow,10),'가족의 갑작스러운 입원으로 방문이 어렵습니다.'),
    make('r2','e3','식사 도움','confirmed','c2',localTime(tomorrow,12)),
    make('r3','e1','생활 도움','completed','c1',localTime(today,9))
  ] };
}
