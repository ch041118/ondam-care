import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {resumeRoute} from '../public/request-view.js';
const source=readFileSync(new URL('../public/agent-ui.js',import.meta.url),'utf8').replace('export function createAgentUI','function createAgentUI');
const catalog=['list_requests','get_statistics'].map(name=>({name,parameters:{properties:{query:{type:'string'}},required:[]}}));
function harness(api,{failCatalog=false}={}){
 let catalogCalls=0;
 const listeners={},fields=[{name:'query',type:'text',value:''}],form={id:'agent-tool-form',elements:fields,getAttribute:()=> 'agent-tool-form'};
 const slot={html:'',set innerHTML(value){this.html=value;fields[0].value='';},querySelector:()=>({scrollTop:0,scrollHeight:0})};
 const context=vm.createContext({queueMicrotask,FormData:class{constructor(f){this.rows=f===form?fields.map(x=>[x.name,x.value]):[['message',f.message]];}entries(){return this.rows.values();}get(key){return this.rows.find(x=>x[0]===key)?.[1]??null;}getAll(key){return this.rows.filter(x=>x[0]===key).map(x=>x[1]);}},document:{addEventListener:(name,fn)=>listeners[name]=fn,getElementById:id=>id==='agent-page'?slot:id==='agent-tool-form'?form:null},api:async(path,body)=>path==='agent/tools'?(()=>{if(failCatalog&&catalogCalls++===0)throw Error('도구 목록 연결 실패');return {tools:catalog,connection:{configured:true}};})():api(path,body),getState:()=>({auth:{user:{role:'caregiver'}},elders:[],caregivers:[],requests:[]}),refresh:async()=>{},toast:()=>{}});
 vm.runInContext(source+'\nvar ui=createAgentUI({api,getState,refresh,toast});',context);
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 const send=message=>listeners.submit({target:{message,getAttribute:()=> 'agent-chat-form'},preventDefault(){}});
 return {listeners,form,fields,slot,tick,send,render:()=>vm.runInContext('ui.render()',context)};
}
test('새로고침 경로는 유효한 직원 메뉴·필터를 유지하고 권한 밖 경로는 초기화한다',()=>{
 assert.equal(resumeRoute({role:'caregiver'},'#caregivers'),'caregivers');
 assert.equal(resumeRoute({role:'social'},'#requests?status=pending'),'requests?status=pending');
 assert.equal(resumeRoute({role:'caregiver'},'#wellness'),'timetable');
 assert.equal(resumeRoute({role:'social'},'#elder/other'),'assistant');
 assert.equal(resumeRoute({role:'elder',elderId:'own'},'#elder/other'),'elder/own');
 assert.equal(resumeRoute({role:'admin'},'#unknown'),'assistant');
});
test('조회 실패 후 입력값을 복원하고 요청 중 업무 선택을 잠근다',async()=>{
 let finish;const h=harness(()=>new Promise((_,reject)=>finish=reject));h.render();await h.tick();
 h.fields[0].value='김영자';const request=h.listeners.submit({target:h.form,preventDefault(){}});
 assert.match(h.slot.html,/id="agent-tool-select" disabled/);assert.equal(h.fields[0].value,'김영자');
 finish(Error('연결 실패'));await request;assert.equal(h.fields[0].value,'김영자');assert.match(h.slot.html,/연결 실패/);
 assert.doesNotMatch(h.slot.html,/id="agent-tool-select" disabled/);
});
test('만료된 대화는 질문을 보존하고 재전송 시 새 대화로 시작한다',async()=>{
 const bodies=[];let calls=0;const h=harness(async(path,body)=>{bodies.push(body);if(++calls===2)throw Object.assign(Error('대화 만료'),{status:404});return {conversationId:'fresh',answer:'답변',traces:[]};});h.render();await h.tick();
 await h.send('첫 질문');await h.send('다음 질문');assert.match(h.slot.html,/>다음 질문<\/textarea>/);assert.match(h.slot.html,/새 대화로 시작/);
 await h.send('다음 질문');assert.equal(bodies[1].conversationId,'fresh');assert.equal(bodies[2].conversationId,null);
});
test('입력 초안은 화면 재렌더링 시 보존하고 HTML을 이스케이프한다',async()=>{
 const h=harness(async()=>({}));h.render();await h.tick();h.listeners.input({target:{id:'agent-question',value:'<img src=x>',closest:()=>null}});
 assert.match(h.render(),/&lt;img src=x&gt;/);assert.doesNotMatch(h.render(),/<img src=x>/);
});

test('도구 목록 연결 실패를 알리고 다시 불러오기 버튼으로 복구한다',async()=>{
 const h=harness(async()=>({}),{failCatalog:true});h.render();await h.tick();assert.match(h.slot.html,/도구 목록 연결 실패/);assert.match(h.slot.html,/data-agent-retry/);
 const button={disabled:false,hasAttribute:key=>key==='data-agent-retry'};
 await h.listeners.click({target:{closest:()=>button}});assert.doesNotMatch(h.slot.html,/도구 목록 연결 실패/);assert.match(h.slot.html,/id="agent-tool-form"/);
});
test('새 조회 실패 시 이전 조회 결과를 성공 결과처럼 남기지 않는다',async()=>{
 let calls=0;const h=harness(async()=>{if(calls++)throw Error('새 조회 실패');return {name:'list_requests',result:{total:42,items:[]}};});h.render();await h.tick();
 await h.listeners.submit({target:h.form,preventDefault(){}});assert.match(h.slot.html,/42건/);
 await h.listeners.submit({target:h.form,preventDefault(){}});assert.match(h.slot.html,/새 조회 실패/);assert.doesNotMatch(h.slot.html,/42건/);
});
test('초기 로그인 전 앱 복귀 이벤트에서 아직 없는 상태를 참조하지 않는다',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const fn=app.split('\n').find(line=>line.startsWith('function resumeHome()'));
 const c=vm.createContext({db:null,$:()=>({innerHTML:''}),resumeRoute,location:{hash:''},openHome:()=>{throw Error('should not run');}});
 vm.runInContext(fn+';resumeHome();',c);
});
