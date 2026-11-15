import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {startLocalVoice} from '../scripts/local-voice.mjs';
import {stopChild} from '../scripts/stop-child.mjs';

function fixture(t){
 const previous=process.env.CLOVER_LOCAL_VOICE;process.env.CLOVER_LOCAL_VOICE='true';
 t.after(()=>{if(previous===undefined)delete process.env.CLOVER_LOCAL_VOICE;else process.env.CLOVER_LOCAL_VOICE=previous;});
 const children=[],stopped=[];
 const options={exists:()=>true,spawnService:()=>{const child=Object.assign(new EventEmitter(),{pid:100+children.length,exitCode:null,signalCode:null,killed:false});children.push(child);return child;},stopService:child=>stopped.push(child.pid)};
 return {children,stopped,options};
}
test('음성 실행: 준비 완료 전 취소하면 생성한 프로세스를 한 번씩 종료한다',async t=>{
 const f=fixture(t),controller=new AbortController(),before=process.listenerCount('exit');let polls=0;
 await assert.rejects(startLocalVoice(process.cwd(),{...f.options,signal:controller.signal,fetchService:async()=>{if(++polls===2)controller.abort();return {ok:false};}}),e=>e.name==='AbortError');
 assert.equal(f.children.length,1);assert.deepEqual(f.stopped,[100]);assert.equal(process.listenerCount('exit'),before);
});
test('음성 실행: 두 번째 서비스 시작 실패 시 첫 번째 서비스도 종료한다',async t=>{
 const f=fixture(t);let polls=0;
 await assert.rejects(startLocalVoice(process.cwd(),{...f.options,fetchService:async()=>({ok:++polls===2}),spawnService:(...args)=>{if(f.children.length)throw Error('두 번째 실행 실패');return f.options.spawnService(...args);}}),/두 번째 실행 실패/);
 assert.deepEqual(f.stopped,[100]);
});
test('음성 실행: 이미 실행 중인 다른 서비스는 종료하지 않는다',async t=>{
 const f=fixture(t),before=process.listenerCount('exit');let polls=0;
 const stop=await startLocalVoice(process.cwd(),{...f.options,fetchService:async()=>({ok:++polls!==2})});
 assert.equal(f.children.length,1);stop();stop();assert.deepEqual(f.stopped,[100]);assert.equal(process.listenerCount('exit'),before);
});
test('음성 실행: 취소된 시작은 프로세스와 연결을 만들지 않는다',async t=>{
 const f=fixture(t),controller=new AbortController();controller.abort();
 await assert.rejects(startLocalVoice(process.cwd(),{...f.options,signal:controller.signal,fetchService:()=>{throw Error('호출하면 안 됨');}}),e=>e.name==='AbortError');assert.equal(f.children.length,0);
});
test('음성 종료: Windows에서는 소유한 프로세스의 하위 모델 실행도 종료한다',()=>{
 const calls=[],child={pid:123,exitCode:null,signalCode:null,killed:false},options={platform:'win32',run:(...args)=>calls.push(args)};
 stopChild(child,options);assert.deepEqual(calls[0][1],['/PID','123','/T','/F']);assert.equal(calls[0][2].windowsHide,true);
 for(const ended of [undefined,{...child,exitCode:0},{...child,signalCode:'SIGTERM'},{...child,killed:true}])stopChild(ended,options);
 assert.equal(calls.length,1);
});
