import {startLocalVoice} from './local-voice.mjs';
import {stopChild} from './stop-child.mjs';
import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {publicPcConfig,checkPublicAccounts} from '../lib/public-pc.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
if(existsSync(resolve(root,'.env')))process.loadEnvFile(resolve(root,'.env'));
const settings=resolve(root,'.env.public');
if(!existsSync(settings))throw Error('deploy/public.env.example을 .env.public으로 복사하고 무료 ngrok HTTPS 주소를 입력해 주세요.');
process.loadEnvFile(settings);
const config=publicPcConfig(process.env);
const agent=process.env.NGROK_PATH||'ngrok';
if(spawnSync(agent,['version'],{windowsHide:true,stdio:'ignore'}).status!==0)throw Error('ngrok를 먼저 설치해 주세요. docs/PC-SERVER.md 참고');
if(spawnSync(agent,['config','check'],{windowsHide:true,stdio:'ignore'}).status!==0)throw Error('ngrok 계정 연결 설정을 확인해 주세요.');
const dataDir=resolve(process.env.CLOVER_DATA_DIR||'data'),state=resolve(dataDir,'state.json');
if(existsSync(state)){
 const db=JSON.parse(readFileSync(state,'utf8'));
 await checkPublicAccounts(db);
}
await new Promise((done,fail)=>{const probe=createServer();probe.once('error',()=>fail(Error('3000번 등 설정한 포트가 사용 중입니다. 기존 앱 서버를 먼저 종료해 주세요.')));probe.listen(config.port,'127.0.0.1',()=>probe.close(done));});
if(process.argv.includes('--check')){console.log('수동 실행 설정 확인 완료. 서버와 외부 연결은 시작하지 않았습니다.');process.exit(0);}
let app,tunnel,stopping=false,stopVoice=()=>{};
const startup=new AbortController();
function stop(code=0){if(stopping)return;stopping=true;startup.abort();stopChild(app);stopChild(tunnel);stopVoice();process.exitCode=code;}
process.once('SIGINT',()=>stop());process.once('SIGTERM',()=>stop());
try{stopVoice=await startLocalVoice(root,{signal:startup.signal});}catch(e){if(!stopping){console.error(e.message);stop(1);}}
if(stopping){stopVoice();}else{
const env={...process.env,NODE_ENV:'production',HOST:'127.0.0.1',LAN_ORIGIN:'',PUBLIC_ORIGIN:config.publicOrigin,TRUST_PROXY:'true',CLOVER_DATA_DIR:dataDir};
app=spawn(process.execPath,['--env-file-if-exists=.env','server.mjs'],{cwd:root,env,windowsHide:true,stdio:['ignore','inherit','inherit']});
app.once('error',()=>{console.error('서버 실행 실패');stop(1);});app.once('exit',code=>{if(!stopping){console.error('서버가 종료되어 외부 연결도 종료합니다.');stop(code||1);}});
try{
 let ready=false;
 for(let i=0;i<100&&!stopping;i++){
  try{const r=await fetch(`http://127.0.0.1:${config.port}/api/health`,{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 if(!ready)throw Error('서버가 시작되지 않았습니다.');
 if(stopping)throw Error('실행이 취소되었습니다.');
 tunnel=spawn(agent,['http',`http://127.0.0.1:${config.port}`,`--url=${config.publicOrigin}`,'--inspect=false'],{cwd:root,windowsHide:true,stdio:['ignore','inherit','inherit']});
 tunnel.once('error',()=>{console.error('ngrok 실행 실패');stop(1);});tunnel.once('exit',code=>{if(!stopping){console.error('외부 연결이 종료되어 앱 서버도 종료합니다.');stop(code||1);}});
 console.log('연결이 성공하면 접속할 주소: '+config.publicOrigin+'/app/');
 console.log('이 창에서 Ctrl+C를 누르면 서버와 외부 연결이 종료됩니다. 자동 실행·자동 재시작은 없습니다.');
}catch(e){if(!stopping)console.error(e.message);stop(1);}
}
