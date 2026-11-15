import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {microphoneError} from '../public/auth-ui.js';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('async function startRecording('),source.indexOf("window.addEventListener('blur'"));
function harness({permission}={}){
 const recorders=[],tracks=[],messages=[],sent=[],timers=[],classes=new Set();
 const button={disabled:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},setAttribute(k,v){this[k]=v;}};
 const guide={textContent:''};
 class Recorder{static isTypeSupported(type){return type==='audio/webm;codecs=opus';}constructor(){this.state='inactive';this.mimeType='audio/webm';recorders.push(this);}start(){this.state='recording';}stop(){this.state='inactive';}}
 const getStream=()=>{const t={stopped:false,stop(){this.stopped=true;},addEventListener(name,fn){this[name]=fn;}};tracks.push(t);return {getTracks:()=>[t],getAudioTracks:()=>[t]};};
 const context=vm.createContext({window:{isSecureContext:true,MediaRecorder:Recorder},MediaRecorder:Recorder,navigator:{userAgent:'test',mediaDevices:{getUserMedia:permission||(async()=>getStream())}},Blob,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout:()=>{},location:{hash:'#elder/e1'},db:{connections:{voice:true}},wellnessUI:null,needsChrome:()=>false,renderElder:()=>{},voiceMessage:text=>messages.push(text),microphoneError,$:s=>s==='#mic'?button:s==='#mic-guide'?guide:null,voicePayload:async blob=>({bytes:blob.size}),api:async(path,body)=>{if(path==='voice-json'){sent.push(body);return {id:'request',status:'draft'};}return {connections:{voice:true}};},updateElderPanels:()=>{},resultText:()=> '내용 확인'});
 vm.runInContext('let pressed=false,recording=false,processing=false,requestingMic=false,stoppingMic=false,cancelRecording=false,recorder,stream,maxTimer,micGeneration=0,lastElderStatus;'+functions,context);
 return {recorders,tracks,messages,sent,timers,button,classes,getStream,start:()=>vm.runInContext('startRecording()',context),stop:cancel=>vm.runInContext(`stopRecording(${Boolean(cancel)})`,context),state:()=>vm.runInContext('({pressed,recording,processing,requestingMic,stoppingMic})',context)};
}
test('브라우저 마이크: 녹음기 오류 후 전송하지 않고 상태를 풀어 다시 녹음한다',async()=>{
 const h=harness();await h.start();const old=h.recorders[0];assert.equal(typeof old.onerror,'function');
 old.onerror({error:Object.assign(Error('device lost'),{name:'NotReadableError'})});assert.equal(h.state().recording,false);assert.equal(h.classes.has('recording'),false);assert.equal(h.tracks[0].stopped,true);
 await h.start();assert.equal(h.recorders.length,2);await old.onstop();assert.equal(h.state().recording,true);assert.equal(h.tracks[1].stopped,false);assert.equal(h.sent.length,0);
});
test('브라우저 마이크: 브라우저가 녹음을 끝내도 입력 상태를 정리하고 재시도한다',async()=>{
 const h=harness();await h.start();const r=h.recorders[0];r.ondataavailable({data:new Blob([new Uint8Array(800)],{type:'audio/webm'})});r.state='inactive';await r.onstop();assert.equal(h.state().recording,false);assert.equal(h.state().pressed,false);assert.equal(h.button.disabled,false);assert.equal(h.sent.length,0);assert.match(h.messages.at(-1),/중단/);await h.start();assert.equal(h.recorders.length,2);
});
test('브라우저 마이크: 기기 연결 해제는 원인을 안내하고 빈 녹음을 보내지 않는다',async()=>{
 const h=harness();await h.start();assert.equal(typeof h.tracks[0].ended,'function');h.tracks[0].ended();assert.equal(h.state().recording,false);assert.equal(h.sent.length,0);assert.match(h.messages.at(-1),/중단|연결/);
});
test('브라우저 마이크: 정상 녹음은 한 번 전송하고 다시 사용할 수 있다',async()=>{
 const h=harness();await h.start();const r=h.recorders[0];r.ondataavailable({data:new Blob([new Uint8Array(800)],{type:'audio/webm'})});h.stop(false);await r.onstop();assert.equal(h.sent.length,1);assert.equal(h.tracks[0].stopped,true);assert.equal(h.button.disabled,false);await h.start();assert.equal(h.recorders.length,2);
});
test('브라우저 마이크: 취소와 권한 거절은 전송 없이 재시도 가능한 상태로 돌아온다',async()=>{
 const h=harness();await h.start();h.stop(true);await h.recorders[0].onstop();assert.equal(h.sent.length,0);assert.equal(h.state().stoppingMic,false);
 const denied=harness({permission:async()=>{throw Object.assign(Error('denied'),{name:'NotAllowedError'});}});await denied.start();assert.match(denied.messages.at(-1),/권한/);assert.equal(denied.state().requestingMic,false);assert.equal(denied.state().pressed,false);
});

test('브라우저 마이크: 권한 창 무응답은 안내 후 잠금을 풀고 늦게 허용된 마이크를 끈다',async()=>{
 let allow;const h=harness({permission:()=>new Promise(resolve=>allow=resolve)}),pending=h.start();
 h.timers.find(t=>t.ms===20000).fn();await pending;
 assert.equal(h.state().requestingMic,false);assert.equal(h.state().pressed,false);assert.match(h.messages.at(-1),/허용 창/);
 allow(h.getStream());await new Promise(resolve=>setImmediate(resolve));assert.equal(h.tracks[0].stopped,true);assert.equal(h.recorders.length,0);
});
