const pending=new Map();let seq=0;
export function nativeCall(method,args={}){return new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('앱 응답이 지연되고 있어요. 다시 시도해 주세요.'));},250000);pending.set(id,{resolve,reject,timer});window.ReactNativeWebView.postMessage(JSON.stringify({id,method,args}));});}
window.cloverBridgeReply=({id,value,error})=>{const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);error?p.reject(Error(error)):p.resolve(value);};
