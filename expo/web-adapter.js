// Capacitor-shaped adapter bundled only into the Expo WebView. Native work is
// performed by Expo Go modules in App.js; no custom native plugins are loaded.
const pending=new Map();let sequence=0;
export function call(method,args={}){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('휴대폰 연결 응답이 지연되고 있어요. 다시 시도해 주세요.'));},145000);pending.set(id,{resolve,reject,timer});window.ReactNativeWebView.postMessage(JSON.stringify({id,method,args}));});}
window.cloverBridgeReply=({id,value,error})=>{const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);error?p.reject(Error(error)):p.resolve(value);};
window.CloverExpo={openSettings:()=>call('settings'),restart:()=>call('restart'),clearAuth:()=>call('auth.clear')};
const listener=async(name,callback)=>{const fn=e=>callback(e.detail);window.addEventListener(`expo:${name}`,fn);return {remove:async()=>window.removeEventListener(`expo:${name}`,fn)};};
export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>window.CloverExpoPlatform||'ios'};
export const CapacitorHttp={request:args=>call('http',args)};
export const Preferences={get:args=>call('storage.get',args),set:args=>call('storage.set',args),remove:args=>call('storage.remove',args)};
export const App={addListener:listener,exitApp:()=>call('exit')};
export const Filesystem={readFile:args=>call('audio.read',args),deleteFile:args=>call('audio.delete',args)};
export const CapacitorAudioRecorder={checkPermissions:()=>call('audio.permission'),requestPermissions:()=>call('audio.request'),startRecording:()=>call('audio.start'),stopRecording:()=>call('audio.stop'),cancelRecording:()=>call('audio.cancel'),addListener:listener};
export const TextToSpeech={stop:()=>call('speech.stop'),speak:args=>call('speech.speak',args)};
export const PushNotifications={requestPermissions:async()=>({receive:'denied'})};
