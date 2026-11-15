import test from 'node:test';
import assert from 'node:assert/strict';
import { createHoldRecorder, validateServerUrl } from '../mobile/core.mjs';
import { createDemoStore } from '../mobile/demo-store.mjs';
import { decodeNativeAudio } from '../lib/voice-input.mjs';
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return {promise, resolve}; };
function harness(overrides = {}) {
  const events = [];
  const control = createHoldRecorder({
    recorder: { permission: async()=>events.push('permission'), start: async()=>events.push('start'), stop: async()=>{events.push('stop');return 'audio';}, cancel: async()=>events.push('cancel'), ...overrides },
    onState: state=>events.push(state), onAudio: async data=>events.push('upload:'+data), onError: error=>events.push('error:'+error.message)
  });
  return { control, events };
}
test('앱: 손을 떼면 녹음을 한 번만 전송한다', async()=> {
  const {control,events}=harness(); await control.press(); await Promise.all([control.release(),control.release()]);
  assert.equal(events.filter(e=>e==='upload:audio').length,1); assert.equal(control.phase,'idle');
});
test('앱: 마이크 권한 대기 중 손을 떼면 녹음을 시작하지 않는다', async()=> {
  const permission=deferred(),{control,events}=harness({permission:()=>permission.promise});
  const pressing=control.press(); await control.release(); permission.resolve(); await pressing;
  assert.ok(!events.includes('start')); assert.ok(!events.includes('upload:audio')); assert.equal(control.phase,'idle');
});
test('앱: 네이티브 녹음 시작 도중 취소하면 열린 마이크를 닫고 전송하지 않는다', async()=> {
  const starting=deferred(),{control,events}=harness({start:()=>starting.promise});
  const pressing=control.press(); await Promise.resolve(); await Promise.resolve(); await control.release(true); starting.resolve(); await pressing;
  assert.ok(events.includes('cancel')); assert.ok(!events.includes('upload:audio')); assert.equal(control.phase,'idle');
});
test('앱: 음성 파일을 가져오는 도중 화면을 떠나면 전송하지 않는다', async()=> {
  const stopping=deferred(),{control,events}=harness({stop:()=>stopping.promise});
  await control.press(); const releasing=control.release(); await control.release(true); stopping.resolve('audio'); await releasing;
  assert.ok(!events.includes('upload:audio')); assert.equal(control.phase,'idle');
});
test('앱: 마이크 권한 거부 후 다음 시도를 허용한다', async()=> {
  const {control,events}=harness({permission:async()=>{throw Error('권한 거부');}}); await control.press();
  assert.ok(events.includes('error:권한 거부')); assert.equal(control.phase,'idle');
});
test('앱: 녹음 제한 시간에 자동 종료한다', async()=> {
  let sent=0;
  const control=createHoldRecorder({recorder:{permission:async()=>{},start:async()=>{},stop:async()=>'audio',cancel:async()=>{}},onState:()=>{},onAudio:async()=>sent++,onError:()=>{},maxMs:5});
  await control.press(); await new Promise(r=>setTimeout(r,25)); assert.equal(sent,1); assert.equal(control.phase,'idle');
});
test('앱: HTTPS 또는 개발용 루프백 주소만 허용한다',()=> {
  assert.equal(validateServerUrl('https://care.example.org/'),'https://care.example.org');
  assert.equal(validateServerUrl('http://localhost:3000'),'http://localhost:3000');
  for(const value of ['http://192.168.1.1:3000','https://user:pass@care.example.org','https://care.example.org/token?secret=x','javascript:alert(1)']) assert.throws(()=>validateServerUrl(value));
});
test('앱: 시연 데이터는 저장 후 재시작해도 유지된다',async()=> {
  let saved;
  const store=createDemoStore(null,async state=>{saved=state;});
  const request=await store.request('demo-request',{elderId:'e1',service:'외출 동행'});
  const restarted=createDemoStore(saved,async()=>{});
  const state=await restarted.request('state');
  assert.equal(state.requests[0].id,request.id); assert.equal(state.connections.voice,false);
});
test('앱: 저장 실패 시 성공한 것처럼 상태를 바꾸지 않는다',async()=> {
  const store=createDemoStore(null,async()=>{throw Error('disk full');});
  const before=await store.request('state');
  await assert.rejects(store.request('demo-request',{elderId:'e1',service:'외출 동행'}));
  const after=await store.request('state'); assert.deepEqual(after,before);
});
test('앱: 동시 중복 시연 요청을 직렬화해 이중 예약을 막는다',async()=> {
  const store=createDemoStore(null,async()=>{});
  const results=await Promise.allSettled([store.request('demo-request',{elderId:'e1',service:'생활 도움'}),store.request('demo-request',{elderId:'e1',service:'생활 도움'})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
});
test('앱: 네이티브 오디오 형식 및 크기를 검사한다',()=> {
  const data=Buffer.from('test audio bytes').toString('base64');
  assert.equal(decodeNativeAudio({audioBase64:data,mimeType:'audio/mp4'}).toString(),'test audio bytes');
  assert.throws(()=>decodeNativeAudio({audioBase64:data,mimeType:'text/html'}));
  assert.throws(()=>decodeNativeAudio({audioBase64:'invalid!',mimeType:'audio/mp4'}));
});
