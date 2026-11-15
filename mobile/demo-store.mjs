import {saveElderNotes} from '../lib/elder-notes.mjs';
import { saveCaregiver, validateHours } from '../lib/caregivers.mjs';
import { ensureWellness, wellnessCommand, publicWellnessState } from '../lib/wellness.mjs';
import { seed } from '../lib/seed.mjs';
import { SERVICES, match, event, transition, resolveCandidates } from '../lib/scheduler.mjs';

// Isolated on-device demonstration; never silently substitutes for a failed server.
export function createDemoStore(initial, persist) {
  let state = ensureWellness(initial || seed());
  let queue = Promise.resolve();
  const mutate = async (path, body) => {
    const db = structuredClone(state);
    let result;
    if(path==='elder-notes'){result=saveElderNotes(db,body,{id:'demo-staff',name:'체험 담당자',role:'admin'});}
    else if(path==='caregivers'){result=await saveCaregiver(db,body,{demo:true});}
    else if(path.startsWith('wellness/')){result=wellnessCommand(db,path,body);}
    else if (path === 'demo-request') {
      if (!db.elders.some(e => e.id === body.elderId) || !SERVICES.includes(body.service)) throw Error('어르신과 돌봄 종류를 확인해 주세요.');
      const requestedAt = body.requestedAt ?? null;
      if (requestedAt !== null && (!Number.isFinite(requestedAt) || requestedAt < Date.now())) throw Error('앞으로의 날짜와 시간을 선택해 주세요.');
      if (db.requests.some(r => r.elderId === body.elderId && r.service === body.service && r.status !== 'completed' && Date.now() - r.createdAt < 60000)) throw Error('방금 같은 요청을 접수했어요.');
      result = { id: crypto.randomUUID(), elderId: body.elderId, service: body.service, requestedAt, duration: 60, transcript: '앱 체험용 가상 요청', demo: true, createdAt: Date.now(), status: 'pending', events: [] };
      event(result, '어르신', '가상 돌봄 요청을 접수했습니다.');
      const assignment = match(db, result);
      if (assignment) {
        Object.assign(result, assignment);
        event(result, '자동 배정', `${db.caregivers.find(c => c.id === result.caregiverId).name} 보호사에게 ${new Date(result.start).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 신청했습니다.`);
      } else {
        result.status = 'attention'; result.reason = '7일 안에 가능한 주변 보호사가 없습니다.';
        event(result, '시스템', result.reason);
      }
      db.requests.unshift(result);
    } else if (path === 'resolve-candidates') {
      return {caregivers:resolveCandidates(db,db.requests.find(r=>r.id===body.id),body)};
    } else if (path === 'action') {
      const request = db.requests.find(r => r.id === body.id);
      if (!request) throw Error('요청을 찾을 수 없습니다.');
      result = transition(db, request, body.action, body);
    } else if (path === 'availability') {
      const caregiver = db.caregivers.find(c => c.id === body.id);
      if(!caregiver)throw Error('요양보호사를 찾을 수 없습니다.');
      Object.assign(caregiver,validateHours(body));result=caregiver;
    } else if (path === 'elders') {
      throw Error('체험 모드에서는 가상 어르신을 선택해 주세요. 신규 주소 등록은 기관 서버 연결 후 사용할 수 있어요.');
    } else throw Error('체험 모드에서 지원하지 않는 요청입니다.');
    await persist(db);
    state = db;
    return structuredClone(result);
  };
  return {
    async request(path, body) {
      if (path === 'state') {
        await queue.catch(() => {});
        return structuredClone({ ...publicWellnessState(state),elders:state.elders.map(e=>({...e,notesEditable:true})), connections: { voice: false, checkinVoice:false, maps: false, wellnessPush:{android:false,ios:false} }, demo: true });
      }
      const operation = queue.then(() => mutate(path, body));
      queue = operation.catch(() => {});
      return operation;
    }
  };
}
