import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

test('hidden elder screen does not poll; slow and failed polls never overlap and can recover',async()=>{
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const callback=source.split('\n').find(line=>line.startsWith('setInterval(async()=>')&&line.includes('7000'));
 let poll,calls=0,finish;
 const context=vm.createContext({document:{visibilityState:'hidden'},navigator:{userAgent:''},window:{},location:{hash:'#elder/e'},db:{requests:[]},recording:false,pressed:false,processing:false,stateRefreshing:0,stateVersion:0,lastElderStatus:'',wellnessUI:null,updateElderPanels:()=>{},needsChrome:()=>false,setInterval:fn=>{poll=fn;},api:()=>{calls++;return new Promise((resolve,reject)=>{finish={resolve,reject};});}});
 vm.runInContext('let statePolling=false;'+callback,context);
 await poll();assert.equal(calls,0);
 context.document.visibilityState='visible';
 const first=poll();await poll();assert.equal(calls,1);
 finish.reject(Error('offline'));await first;
 const second=poll();assert.equal(calls,2);
 finish.resolve({requests:[]});await second;
 const third=poll();assert.equal(calls,3);
 finish.resolve({requests:[]});await third;
});

function pollingFixture(){
 const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').split('\n');
 const callbacks={},pending=[],overlay={innerHTML:''};let renders=0,voices=0;
 const context=vm.createContext({document:{visibilityState:'visible',activeElement:null},navigator:{userAgent:''},window:{},location:{hash:'#overview'},page:'overview',db:{requests:[],revision:0},recording:false,pressed:false,processing:false,lastElderStatus:'',wellnessUI:null,updateElderPanels:()=>{},needsChrome:()=>false,$:()=>overlay,render:()=>renders++,voiceMessage:()=>voices++,resultText:()=>'',filterRows:()=>{},setInterval:(fn,time)=>{callbacks[time]=fn;},api:()=>new Promise((resolve,reject)=>pending.push({resolve,reject}))});
 vm.runInContext('let statePolling=false,stateRefreshing=0,stateVersion=0;'+source.find(line=>line.startsWith('async function refresh()'))+'\n'+source.filter(line=>line.startsWith('setInterval(async()=>')).join('\n'),context);
 return {context,callbacks,pending,overlay,get renders(){return renders;},get voices(){return voices;},refresh:()=>vm.runInContext('refresh()',context)};
}
test('화면 갱신: 느린 자동 응답으로 방금 저장한 최신 화면을 덮어쓰지 않는다',async()=>{
 const f=pollingFixture(),poll=f.callbacks[15000](),refresh=f.refresh();
 f.pending[1].resolve({requests:[],revision:2});await refresh;
 f.pending[0].resolve({requests:[],revision:1});await poll;
 assert.equal(f.context.db.revision,2);assert.equal(f.renders,1);
});
test('화면 갱신: 요청 도중 마이크를 누르거나 페이지를 떠나면 안내를 끼워 넣지 않는다',async()=>{
 for(const change of [f=>{f.context.pressed=true;},f=>{f.context.location.hash='#overview';},f=>{f.context.document.visibilityState='hidden';}]){
  const f=pollingFixture();f.context.location.hash='#elder/e';const poll=f.callbacks[7000]();change(f);
  f.pending[0].resolve({revision:1,requests:[{id:'new',elderId:'e',status:'confirmed'}]});await poll;
  assert.equal(f.context.db.revision,0);assert.equal(f.voices,0);
 }
});
test('화면 갱신: 응답 전에 입력창이나 상세 창을 열면 자동 렌더링을 생략한다',async()=>{
 for(const change of [f=>{f.overlay.innerHTML='상세 화면';},f=>{f.context.document.activeElement={tagName:'INPUT'};}]){
  const f=pollingFixture(),poll=f.callbacks[15000]();change(f);f.pending[0].resolve({revision:1,requests:[]});await poll;
  assert.equal(f.context.db.revision,0);assert.equal(f.renders,0);
 }
});
test('화면 갱신: 겹친 수동 갱신은 최신 요청만 적용하고 모두 끝난 후 자동 확인을 재개한다',async()=>{
 const f=pollingFixture(),first=f.refresh(),second=f.refresh();
 f.pending[0].resolve({revision:1,requests:[]});await first;await f.callbacks[15000]();assert.equal(f.pending.length,2);
 f.pending[1].resolve({revision:2,requests:[]});await second;
 const poll=f.callbacks[15000]();assert.equal(f.pending.length,3);f.pending[2].resolve({revision:3,requests:[]});await poll;assert.equal(f.context.db.revision,3);
});
