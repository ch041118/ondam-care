import {apiHeaders,readApiResponse,parseApiBody} from '../public/http-response.js';
import { authenticate } from '../public/auth-ui.js';
import { caregiverFields, caregiverValues } from '../public/caregiver-fields.js';
import { PushNotifications } from '@capacitor/push-notifications';
import { setupWellnessPush, notificationDeviceId } from './notifications.js';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Filesystem } from '@capacitor/filesystem';
import { CapacitorAudioRecorder } from '@capgo/capacitor-audio-recorder';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { createDemoStore } from './demo-store.mjs';
import { validateServerUrl, createHoldRecorder } from './core.mjs';

const CONFIG_KEY = 'clover.device.v1';
const DEMO_KEY = 'clover.demo.v1';
const native = Capacitor.isNativePlatform();
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let config, demoStore, controller, authToken, authTokenOrigin;
let speechQueue = Promise.resolve();
async function read(key) {
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : null;
}
async function save(key, value) { await Preferences.set({ key, value: JSON.stringify(value) }); }
async function demo() {
  if (!demoStore) demoStore = createDemoStore(await read(DEMO_KEY), state => save(DEMO_KEY, state));
  return demoStore;
}
async function remote(path, data, server = config.server) {
  if (!native) {
    const response = await fetch(`${server}/api/${path}`, data ? { method: 'POST', headers: apiHeaders({'Content-Type':'application/json'}), credentials:'include', body: JSON.stringify(data), signal: AbortSignal.timeout(path.startsWith('agent/')?240000:130000) } : { headers:apiHeaders(), credentials:'include', signal: AbortSignal.timeout(15000) });
    const body = await readApiResponse(response);
    if (!response.ok) throw Object.assign(Error(body.error || '서버에 연결하지 못했어요.'),{status:response.status});
    return body;
  }
  const response = await CapacitorHttp.request({ url: `${server}/api/${path}`, method: data ? 'POST' : 'GET', headers: apiHeaders({'Content-Type':'application/json','X-Clover-Client':'native',...(authToken&&authTokenOrigin===server?{Authorization:'Bearer '+authToken}:{})}), data, responseType: 'text', connectTimeout: 15000, readTimeout: path.startsWith('agent/')?240000:130000 });
  response.data=parseApiBody(typeof response.data==='string'?response.data:JSON.stringify(response.data),response.status,response.headers?.['content-type']||'');
  if (response.status < 200 || response.status >= 300) throw Object.assign(Error(response.data?.error || '서버에 연결하지 못했어요.'),{status:response.status});
  if(response.data.token){authToken=response.data.token;authTokenOrigin=server;delete response.data.token;}
  return response.data;
}
async function api(path, body) {
  try{return config.connection === 'demo' ? (await demo()).request(path, body) : await remote(path, body);}catch(e){if(e.status===401&&!path.startsWith('auth/'))window.dispatchEvent(new Event('clover-auth-expired'));throw e;}
}
function setup(initial = {}) {
  return new Promise(resolve => {
    const app = document.querySelector('#app');
    app.innerHTML = `<main class="device-setup"><div class="setup-logo">✤</div><div class="eyebrow">CLOVER CARE</div><h1>안심되는 돌봄,<br>앱에서도 함께해요.</h1><p class="subtitle">처음 한 번, 담당 보호사가 설정해 주세요.<br>다음부터는 선택한 화면으로 바로 열립니다.</p><form id="device-form"><label for="connection">사용 환경</label><select id="connection"><option value="demo">가상 데이터로 체험하기 · 서버 불필요</option><option value="server">실제 계정 로그인 · 기관 서버 연결</option></select><div id="server-fields" hidden><label for="server-url">서버 주소</label><input id="server-url" type="url" inputmode="url" placeholder="https://care.example.org"><p class="setup-hint">기관 서버 주소를 입력하세요. PC 로컬 서버는 USB 개발 연결 설정이 필요합니다.</p></div><button type="button" class="btn" id="check-connection">연결 확인 · 사용자 불러오기</button><section id="identity-fields" hidden><label for="device-role">이 기기를 누가 사용하나요?</label><select id="device-role"><option value="elder">어르신 · 마이크 하나만 표시</option><option value="caregiver">요양보호사 · 일정 확인과 어르신 등록</option><option value="social">사회복지사 · 조율과 처리 내역</option></select><div id="elder-field"><label for="device-elder">이 기기를 사용할 어르신</label><select id="device-elder"></select></div><div id="caregiver-field" hidden><label for="device-caregiver">담당 요양보호사</label><select id="device-caregiver"></select><div id="caregiver-signup-fields" hidden></div></div><label style="display:flex;gap:8px;align-items:center"><input id="device-notifications" type="checkbox" checked style="width:auto;min-height:0">안부 및 담당자 확인 알림 받기</label><button type="submit" class="btn primary setup-start">클로버 시작하기</button></section><p id="setup-message" role="status" aria-live="polite" class="notice">체험 모드의 요청은 기기에만 저장되며 실제 보호사에게 전달되지 않습니다. 음성 요청은 서버 연결 후 사용할 수 있습니다.</p></form><small>실제 계정은 기관 서버에 저장됩니다. 체험 데이터와 분리됩니다.</small></main>`;
    const get = id => document.getElementById(id);
    get('connection').value = initial.connection || 'server';
    get('server-url').value = initial.server || (!native?location.origin:'');
    get('device-notifications').checked=initial.notifications!==false;
    if(window.CloverExpo){get('device-notifications').checked=false;get('device-notifications').disabled=true;get('device-notifications').parentElement.append(' · Expo Go에서는 푸시 체험을 지원하지 않습니다.');}
    get('server-fields').hidden = get('connection').value !== 'server';
    let verified;
    const invalidate = () => { verified = undefined; if(get('identity-fields'))get('identity-fields').hidden = true; get('server-fields').hidden = get('connection').value !== 'server'; };
    get('connection').onchange = invalidate;
    get('server-url').oninput = invalidate;
    const signup=()=>{const show=get('device-role').value==='caregiver'&&get('device-caregiver').value==='new';get('caregiver-signup-fields').hidden=!show;get('caregiver-signup-fields').querySelectorAll('input,select').forEach(el=>el.disabled=!show);};
    get('device-caregiver').onchange=signup;
    get('device-role').onchange = () => {
      get('elder-field').hidden = get('device-role').value !== 'elder';
      get('caregiver-field').hidden = get('device-role').value !== 'caregiver';signup();
    };
    get('check-connection').onclick = async () => {
      get('check-connection').disabled = true;
      try {
        const connection = get('connection').value;
        const server = connection === 'server' ? validateServerUrl(get('server-url').value.trim()) : '';
        if(connection==='server'){const result=await authenticate({api:(path,data)=>remote(path,data,server),onBack:true});if(!result){resolve(await setup(initial));return;}const next={connection:'server',server,role:result.user.role,caregiverId:result.user.caregiverId,elderId:result.user.elderId,notifications:!window.CloverExpo};await save(CONFIG_KEY,next);resolve(next);return;}
        const state = connection === 'demo' ? await (await demo()).request('state') : await remote('state', undefined, server);
        if (!Array.isArray(state.elders) || !Array.isArray(state.caregivers) || !Array.isArray(state.requests) || !state.connections) throw Error('클로버 서버 응답을 확인해 주세요.');
        verified = { connection, server, state };
        get('device-elder').innerHTML = state.elders.map(e => `<option value="${escape(e.id)}">${escape(e.name)} 어르신</option>`).join('');
        get('device-caregiver').innerHTML = '<option value="new">새 요양보호사 회원가입</option>'+state.caregivers.map(c => `<option value="${escape(c.id)}">${escape(c.name)} 요양보호사</option>`).join('');
        get('caregiver-signup-fields').innerHTML=caregiverFields({},connection==='demo');
        get('device-role').value = initial.role || 'elder';
        if (state.elders.some(e=>e.id===initial.elderId)) get('device-elder').value = initial.elderId;
        if (state.caregivers.some(c=>c.id===initial.caregiverId)) get('device-caregiver').value = initial.caregiverId;
        get('device-role').onchange();
        get('identity-fields').hidden = false;
        get('setup-message').textContent = connection === 'demo' ? '체험 준비가 됐어요. 이 기기에서 사용할 화면을 선택해 주세요.' : `서버에 연결됐어요. ${state.connections.voice ? '음성 설정이 있습니다. 실제 녹음 테스트가 필요합니다.' : '서버의 음성 인식·LLM 설정은 아직 없습니다.'}`;
      } catch (error) { verified = undefined; get('identity-fields').hidden = true; if(get('setup-message'))get('setup-message').textContent = error.message || '서버 연결을 확인해 주세요.';else{resolve(await setup(initial));} }
      finally { if(get('check-connection'))get('check-connection').disabled = false; }
    };
    get('device-form').onsubmit = async event => {
      event.preventDefault();
      if (!verified) return;
      const result = { connection: verified.connection, server: verified.server, role: get('device-role').value, elderId: get('device-elder').value, caregiverId: get('device-caregiver').value, notifications:get('device-notifications').checked };
      if (result.role === 'elder' && !result.elderId) { get('setup-message').textContent = '담당자 화면에서 어르신을 먼저 등록해 주세요.'; return; }
      if (result.role === 'caregiver' && !result.caregiverId) { get('setup-message').textContent = '등록된 요양보호사가 없습니다.'; return; }
      const button = get('device-form').querySelector('[type="submit"]'); button.disabled = true;
      try {
        if(result.role==='caregiver'&&result.caregiverId==='new'){const body=caregiverValues(get('device-form'));const c=verified.connection==='demo'?await (await demo()).request('caregivers',body):await remote('caregivers',body,result.server);result.caregiverId=c.id;verified.state.caregivers.push(c);get('device-caregiver').insertAdjacentHTML('beforeend',`<option value="${escape(c.id)}">${escape(c.name)}</option>`);get('device-caregiver').value=c.id;signup();}
        if(native&&initial.connection==='server'&&(initial.server!==result.server||initial.role!==result.role||initial.elderId!==result.elderId||!result.notifications))await remote('wellness/device-disable',{id:await notificationDeviceId()},initial.server);
        if(native&&result.connection==='server'&&result.notifications)await PushNotifications.requestPermissions();
        await save(CONFIG_KEY, result); resolve(result); }
      catch(error) { get('setup-message').textContent = error.message || '기기 설정을 저장하지 못했어요.'; button.disabled = false; }
    };
  });
}
async function nativeSpeak(text) {
  if (!native) return false;
  speechQueue = speechQueue.catch(() => {}).then(async () => {
    await TextToSpeech.stop();
    void TextToSpeech.speak({ text, lang:'ko-KR', rate:.85, category:'ambient' }).catch(() => {});
  });
  await speechQueue;
  return true;
}
function bindRecorder({ button, guide, message, ready, getElderId, getCheckinId, submitted, failure }) {
  if (!native) return false;
  let recordedElder,recordedCheckin;
  controller = createHoldRecorder({
    recorder: {
      async permission() {
        await TextToSpeech.stop().catch(() => {});
        let permission = await CapacitorAudioRecorder.checkPermissions();
        if (permission.recordAudio !== 'granted') permission = await CapacitorAudioRecorder.requestPermissions();
        if (permission.recordAudio !== 'granted') throw Error('설정에서 클로버의 마이크 사용을 허용해 주세요.');
      },
      start: () => CapacitorAudioRecorder.startRecording({ sampleRate: 16000, bitRate: 64000 }),
      cancel: () => CapacitorAudioRecorder.cancelRecording(),
      async stop() {
        const result = await CapacitorAudioRecorder.stopRecording();
        if (!result.uri) throw Error('녹음을 가져오지 못했어요. 다시 말씀해 주세요.');
        try {
          if (!result.duration || result.duration < 350) throw Error('조금 더 길게 말씀해 주세요.');
          const file = await Filesystem.readFile({ path: result.uri });
          if (typeof file.data !== 'string') throw Error('녹음 파일을 읽지 못했어요.');
          return file.data;
        } finally { await Filesystem.deleteFile({ path: result.uri }).catch(() => {}); }
      }
    },
    onState(phase) {
      const recording = phase === 'recording';
      button.classList.toggle('recording', recording);
      button.setAttribute('aria-pressed', String(recording));
      button.disabled = ['stopping','sending'].includes(phase);
      if (recording) { guide.textContent = '듣고 있어요. 편하게 말씀하세요.'; message('말씀을 마치면 손을 떼 주세요.', false); }
      else if (phase === 'sending') message('말씀하신 부탁을\n확인하고 있어요.', false);
      else if (phase === 'idle') guide.textContent = '아래 마이크를 꾹 누르고 말씀해 주세요.';
    },
    async onAudio(audioBase64) {
      const request = await remote('voice-json', { elderId:recordedElder, attemptId:crypto.randomUUID(), audioBase64, mimeType:'audio/mp4',checkinId:recordedCheckin });
      await submitted(request);
    },
    onError: error => failure(error.message || '녹음을 처리하지 못했어요. 다시 말씀해 주세요.')
  });
  const press = () => {
    if (!ready()) { message('음성 연결을 준비 중이에요.\n담당 보호사에게 알려 주세요.'); return; }
    recordedElder = getElderId(); recordedCheckin=getCheckinId?.(); void controller.press();
  };
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); press(); });
  button.addEventListener('pointerup', () => { void controller.release(); });
  button.addEventListener('pointercancel', () => { void controller.release(true); });
  button.addEventListener('contextmenu', event => event.preventDefault());
  button.addEventListener('keydown', event => { if ([' ','Enter'].includes(event.key) && !event.repeat) { event.preventDefault(); press(); } });
  button.addEventListener('keyup', event => { if ([' ','Enter'].includes(event.key)) { event.preventDefault(); void controller.release(); } });
  return true;
}
async function boot() {
  config = await read(CONFIG_KEY);
  if (!config || window.CloverExpoSetup || new URLSearchParams(location.search).has('setup')) config = await setup(config || {});
  if (config.connection === 'server') {config.server=validateServerUrl(config.server);const result=await authenticate({api:(path,data)=>remote(path,data)});Object.assign(config,{role:result.user.role,caregiverId:result.user.caregiverId,elderId:result.user.elderId});await save(CONFIG_KEY,config);}
  sessionStorage.setItem('role', config.role === 'elder' ? 'social' : config.role);
  sessionStorage.setItem('caregiver', config.caregiverId || 'c1');
  const route = config.role === 'elder' ? `elder/${encodeURIComponent(config.elderId)}` : 'overview';
  if(window.CloverExpo)location.hash=route;else history.replaceState(null, '', `${location.pathname}#${route}`);
  document.documentElement.classList.add('installed-app');
  window.CloverNative = {
    api, bindRecorder, speak: nativeSpeak,
    login:async()=>{await save(CONFIG_KEY,{...config,connection:'server',server:config.server||(!native?location.origin:'')});window.CloverNative.openSettings();},
    logout:async alreadyRevoked=>{if(!alreadyRevoked){try{await remote('auth/logout',{});}catch(e){if(e.status!==401)throw e;}}authToken=null;authTokenOrigin=null;if(window.CloverExpo){await window.CloverExpo.clearAuth();await window.CloverExpo.restart();}else location.reload();},
    get busy() { return controller && controller.phase !== 'idle'; },
    cancel: () => { void controller?.release(true); },
    openSettings: () => { if(window.CloverExpo){void window.CloverExpo.openSettings();return;}location.href = `${location.pathname}?setup=1`; },
    selectCaregiver: async id => {if(config.connection!=='demo')throw Error('로그인한 보호사만 선택할 수 있습니다.');const next={...config,role:'caregiver',caregiverId:id};await save(CONFIG_KEY,next);Object.assign(config,next);},
    modeLabel: config.connection === 'demo' ? '기기 내 체험 데이터' : '개발 서버 연결',
    config
  };
  if (native) {
    await App.addListener('appStateChange', ({isActive}) => { if(isActive)window.dispatchEvent(new Event('clover-foreground')); if (!isActive) { void controller?.release(true); void TextToSpeech.stop().catch(() => {}); } });
    if (Capacitor.getPlatform() === 'android') await App.addListener('backButton', () => {
      if (controller && controller.phase !== 'idle') { void controller?.release(true); return; }
      if (document.querySelector('.drawer')) { document.querySelector('[data-do="close"]')?.click(); return; }
      if (config.role === 'elder' || ['#overview','#requests'].includes(location.hash)) { void App.exitApp(); return; }
      location.hash = config.role === 'caregiver' ? 'requests' : 'overview';
    });
    await CapacitorAudioRecorder.addListener('recordingPaused', () => { void controller?.release(true); });
    await CapacitorAudioRecorder.addListener('recordingError', () => { void controller?.release(true); });
  }
  let expiring=false;window.addEventListener('clover-auth-expired',()=>{if(expiring)return;expiring=true;void controller?.release(true);if(window.CloverExpo)void window.CloverExpo.restart();else location.reload();});
  await import('../public/app.js');
  await setupWellnessPush({config,api,onEnable:()=>save(CONFIG_KEY,config)});
  let settingsTimer;
  document.addEventListener('pointerdown', event => { if (event.target.closest('.elder .brand')) settingsTimer = setTimeout(() => window.CloverNative.openSettings(), 4000); });
  for (const eventName of ['pointerup','pointercancel']) document.addEventListener(eventName, () => clearTimeout(settingsTimer));
}
boot().catch(error => {
  document.getElementById('app').innerHTML = `<main class="device-setup"><h1>앱 설정을 확인해 주세요.</h1><p class="notice">${escape(error.message)}</p><button id="recover" class="btn primary">기기 설정 다시 열기</button></main>`;
  document.getElementById('recover').onclick = async () => {
    await Preferences.remove({ key: CONFIG_KEY }); if(window.CloverExpo){await window.CloverExpo.openSettings();return;}location.href = `${location.pathname}?setup=1`;
  };
});
import '../public/splash.js';
