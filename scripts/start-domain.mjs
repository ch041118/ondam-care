import {spawn,spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {domainConfig} from '../lib/domain-config.mjs';
import {checkPublicAccounts} from '../lib/public-pc.mjs';
import {startLocalVoice} from './local-voice.mjs';
import {stopChild} from './stop-child.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
if(existsSync('.env'))process.loadEnvFile('.env');
if(!existsSync('.env.domain'))throw Error('deploy/domain.env.example을 .env.domain으로 복사하고 구매한 도메인을 입력해 주세요.');
process.loadEnvFile('.env.domain');
const config=domainConfig(process.env),caddy=process.env.CADDY_PATH||'caddy';
const dataDir=resolve(process.env.CLOVER_DATA_DIR||'data');
const env={...process.env,CLOVER_DOMAIN:config.domain,PORT:String(config.port),NODE_ENV:'production',HOST:'127.0.0.1',LAN_ORIGIN:'',PUBLIC_ORIGIN:config.publicOrigin,TRUST_PROXY:'true',CLOVER_DATA_DIR:dataDir};
const state=resolve(dataDir,'state.json');
if(existsSync(state))await checkPublicAccounts(JSON.parse(readFileSync(state,'utf8')));
if(spawnSync(caddy,['version'],{windowsHide:true,stdio:'ignore'}).status!==0)throw Error('Caddy를 설치하고 CADDY_PATH를 설정해 주세요. docs/DOMAIN-SERVER.md 참고');
// Adapt validates syntax without starting a listener or requesting certificates.
if(spawnSync(caddy,['adapt','--config','deploy/Caddyfile.pc','--adapter','caddyfile'],{env,windowsHide:true,stdio:'ignore'}).status!==0)throw Error('HTTPS 설정을 확인해 주세요.');
if(process.argv.includes('--check')){
  console.log('도메인 설정과 Caddy 구문 확인 완료. DNS·외부 접속·인증서 발급은 아직 확인하지 않았습니다.');
  process.exit(0);
}
await new Promise((done,fail)=>{const probe=createServer();probe.once('error',()=>fail(Error('기존 앱 실행창에서 Ctrl+C로 서버를 종료한 뒤 다시 실행해 주세요.')));probe.listen(config.port,'127.0.0.1',()=>probe.close(done));});
let app,proxy,stopping=false,stopVoice=()=>{};
const startup=new AbortController();
function stop(code=0){if(stopping)return;stopping=true;startup.abort();stopChild(proxy);stopChild(app);stopVoice();process.exitCode=code;}
process.once('SIGINT',()=>stop());process.once('SIGTERM',()=>stop());
function start(args,executable=process.execPath){
  const child=spawn(executable,args,{cwd:root,env,windowsHide:true,stdio:['ignore','inherit','inherit']});
  child.once('error',()=>{console.error('실행 실패: 경로와 포트 사용 여부를 확인해 주세요.');stop(1);});
  child.once('exit',code=>{if(!stopping){console.error('구성 요소가 종료되어 서버도 종료합니다.');stop(code||1);}});
  return child;
}
try{
  stopVoice=await startLocalVoice(root,{signal:startup.signal});
  if(stopping){stopVoice();process.exitCode=1;}else{
    app=start(['server.mjs']);
    let ready=false;
    for(let i=0;i<100&&!stopping;i++){
      try{const r=await fetch(`http://127.0.0.1:${config.port}/api/health`,{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
      await new Promise(r=>setTimeout(r,100));
    }
    if(!ready||stopping)throw Error('앱 서버가 시작되지 않았습니다.');
    proxy=start(['run','--config','deploy/Caddyfile.pc','--adapter','caddyfile'],caddy);
    console.log(`HTTPS 인증서 발급 성공 후 접속할 주소: ${config.publicOrigin}/app/`);
    console.log('Ctrl+C로 종료합니다. 자동 시작·자동 재시작은 없습니다. DNS와 공유기 설정이 필요합니다.');
  }
}catch(e){if(!stopping)console.error(e.message);stop(1);}
