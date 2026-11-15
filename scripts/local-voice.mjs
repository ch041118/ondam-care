import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {stopChild} from './stop-child.mjs';

// Called only by a manually launched server; never installs an OS startup task.
export async function startLocalVoice(root,{signal,spawnService=spawn,fetchService=fetch,exists=existsSync,stopService=stopChild}={}) {
 signal?.throwIfAborted();
 if(process.env.CLOVER_LOCAL_VOICE!=='true')return ()=>{};
 const python=resolve(root,'.tooling/python/python.exe'),ollama=resolve(root,'.tooling/ollama/ollama.exe');
 if(!exists(python)||!exists(ollama))throw Error('로컬 음성 프로그램 설치를 확인해 주세요.');
 const children=[];let stopped=false;
 const stop=()=>{if(stopped)return;stopped=true;for(const child of children)stopService(child);process.removeListener('exit',stop);signal?.removeEventListener('abort',stop);};
 process.once('exit',stop);signal?.addEventListener('abort',stop,{once:true});
 const timeout=ms=>signal?AbortSignal.any([signal,AbortSignal.timeout(ms)]):AbortSignal.timeout(ms);
 const env={...process.env,OLLAMA_HOST:'127.0.0.1:11435',OLLAMA_MODELS:resolve(root,'.tooling/models/ollama'),OLLAMA_NO_CLOUD:'1',OLLAMA_NUM_PARALLEL:'1',OLLAMA_KEEP_ALIVE:process.env.OLLAMA_KEEP_ALIVE||'60s',PYTHONUTF8:'1',HF_HUB_OFFLINE:'1'};
 const endpoints=[
  {url:'http://127.0.0.1:11435/api/tags',bin:ollama,args:['serve'],headers:{}},
  {url:'http://127.0.0.1:18000/health',bin:python,args:['scripts/local-stt.py'],headers:{Authorization:'Bearer '+process.env.STT_TOKEN}}
 ];
 try{
  for(const service of endpoints){
   signal?.throwIfAborted();
   let online=false;
   try{online=(await fetchService(service.url,{headers:service.headers,signal:timeout(1500)})).ok;}catch{}
   signal?.throwIfAborted();
   if(online)continue;
   const child=spawnService(service.bin,service.args,{cwd:root,env,windowsHide:true,stdio:['ignore','inherit','inherit']});children.push(child);
   let failed=false;child.once('error',()=>{failed=true;});
   for(let i=0;i<120;i++){
    signal?.throwIfAborted();
    if(failed||child.exitCode!==null)throw Error('로컬 음성 프로그램 실행에 실패했습니다.');
    try{if((await fetchService(service.url,{headers:service.headers,signal:timeout(1000)})).ok){online=true;break;}}catch{}
    await delay(500,undefined,{signal});
   }
   if(!online)throw Error('로컬 음성 프로그램 준비 시간이 초과되었습니다.');
  }
  signal?.throwIfAborted();
  console.log('로컬 음성 인식과 AI 연결 준비 완료');
  return stop;
 }catch(e){stop();throw e;}
}
