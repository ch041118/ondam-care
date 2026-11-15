import {initialRoute} from './request-view.js';
import {bindMicInput} from './mic-input.js';
import { nativeCall as call } from './native-bridge.js';
import { authenticate } from './auth-ui.js';
import { createHoldRecorder } from './hold-recorder.js';
let unbindMic,controller,identity,restarting=false;
async function api(path,body){const r=await call('api',{path:'/api/'+path,method:body?'POST':'GET',body});if(r.status<200||r.status>=300){if(r.status===401&&!path.startsWith('auth/'))restart();throw Object.assign(Error(r.data.error||'요청을 처리하지 못했습니다.'),{status:r.status});}return r.data;}
function restart(){if(restarting)return;restarting=true;void controller?.release(true);location.reload();}
function bindRecorder({button,guide,message,ready,getElderId,getCheckinId,submitted,failure}){
 let elderId,checkinId,toggle=false;
 controller=createHoldRecorder({recorder:{permission:async()=>{await call('speech.stop');const p=await call('audio.request');if(!p.granted)throw Error('마이크 사용을 허용해 주세요.');},start:()=>call('audio.start'),cancel:()=>call('audio.cancel'),stop:()=>call('audio.stop')},onState:phase=>{const recording=phase==='recording';button.classList.toggle('recording',recording);button.setAttribute('aria-pressed',String(recording));button.disabled=['stopping','sending'].includes(phase);if(recording){guide.textContent='듣고 있어요. 편하게 말씀하세요.';message(toggle?'말씀을 마치면 마이크를 한 번 더 눌러 주세요.':'말씀을 마치면 손을 떼 주세요.',false);}else if(phase==='sending')message('말씀하신 부탁을 확인하고 있어요.',false);else if(phase==='idle')guide.textContent='아래 마이크를 꾹 누르고 말씀해 주세요.';},onAudio:async audio=>{if(audio.duration<350)throw Error('조금 더 길게 말씀해 주세요.');const result=await api('voice-json',{elderId,checkinId,attemptId:crypto.randomUUID(),audioBase64:audio.base64,mimeType:'audio/mp4'});await submitted(result);},onError:e=>failure(e.message)});
 const press=(mode={})=>{toggle=Boolean(mode.toggle);if(!ready()){message('아직 음성 서비스를 연결하지 못했어요. 아래 계정 메뉴에서 보호사가 확인해 주세요.');return;}elderId=getElderId();checkinId=getCheckinId?.();void controller.press();};
 unbindMic?.();unbindMic=bindMicInput(button,{press,release:cancel=>void controller.release(cancel)});return true;
}
async function push(requestPermission,enable=false){const result=await call('push.sync',{requestPermission,enable});window.CloverNative.pushStatus=result.message;window.dispatchEvent(new Event('clover-push-status'));return result;}
async function boot(){
 if(!window.ReactNativeWebView){await import('./app.js');return;}
 document.documentElement.classList.add('installed-app');
 identity=await authenticate({api});const user=identity.user;
 window.CloverNative={callPhone:phone=>call('phone.call',{phone}),api,bindRecorder,config:{connection:'server',role:user.role,caregiverId:user.caregiverId,elderId:user.elderId},modeLabel:'계정 연결됨',get busy(){return Boolean(controller&&controller.phase!=='idle');},cancel:()=>void controller?.release(true),speak:async text=>{await call('speech.stop');await call('speech.speak',{text});return true;},logout:async revoked=>{if(!revoked){try{await api('auth/logout',{});}catch(e){if(e.status!==401)throw e;}}await call('auth.clear');restart();},openSettings:()=>void call('settings'),enablePush:()=>push(true,true),clearCheckinNotifications:id=>call('push.clear',{id})};
 if(user.role==='elder')location.hash='elder/'+user.elderId;else if(!location.hash||location.hash.startsWith('#elder/'))location.hash=initialRoute(user);
 window.addEventListener('clover-native-active',()=>{window.dispatchEvent(new Event('clover-foreground'));void push(false).catch(()=>{});});
 window.addEventListener('clover-native-inactive',()=>{void controller?.release(true);});
 window.addEventListener('clover-native-back',()=>{if(controller?.phase!=='idle'&&controller){void controller.release(true);return;}if(document.querySelector('.drawer')){document.querySelector('[data-do="close"]')?.click();return;}if(user.role==='elder'||['#overview','#requests','#assistant','#timetable'].includes(location.hash)){void call('exit');return;}location.hash=initialRoute(user);});
 window.addEventListener('clover-native-notification',()=>{location.hash=user.role==='elder'?'elder/'+user.elderId:'overview';window.dispatchEvent(new Event('clover-foreground'));});
 await import('./app.js');await call('ready');
 void push(true).catch(()=>{window.CloverNative.pushStatus='알림 연결을 확인하지 못했습니다. 앱 설정에서 다시 시도해 주세요.';});
 let timer;document.addEventListener('pointerdown',e=>{if(e.target.closest('.elder .brand'))timer=setTimeout(()=>void call('settings'),4000);});for(const event of ['pointerup','pointercancel'])document.addEventListener(event,()=>clearTimeout(timer));
}
boot().catch(e=>{const app=document.getElementById('app');app.replaceChildren();const main=document.createElement('main');main.className='device-setup';const title=document.createElement('h1');title.textContent='연결을 확인해 주세요.';const message=document.createElement('p');message.textContent=e.message;const retry=document.createElement('button');retry.className='btn primary';retry.textContent='다시 연결';retry.onclick=()=>location.reload();main.append(title,message,retry);if(window.ReactNativeWebView){const settings=document.createElement('button');settings.className='btn';settings.textContent='웹 서버 설정';settings.onclick=()=>void call('settings');main.append(settings);}app.append(main);});
import './splash.js';
