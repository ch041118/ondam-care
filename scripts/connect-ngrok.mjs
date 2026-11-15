import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const agent=resolve(root,'.tooling/ngrok/ngrok.exe');
if(!process.stdin.isTTY)throw Error('직접 연 터미널에서 실행해 주세요.');
let muted=false;
const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
try{
 console.log('ngrok 대시보드의 Your Authtoken을 이 창에 붙여넣으세요. 입력 내용은 표시하지 않습니다.');
 process.stdout.write('Authtoken: ');muted=true;const token=(await rl.question('')).trim();muted=false;process.stdout.write('\n');
 if(!token||token.length>1000||/\s/.test(token))throw Error('인증 토큰 형식을 확인해 주세요.');
 const result=spawnSync(agent,['config','add-authtoken',token],{windowsHide:true,stdio:'ignore'});
 if(result.status!==0)throw Error('ngrok 설정 저장 실패. ngrok 설치와 사용자 폴더 권한을 확인해 주세요.');
 console.log('인증 설정을 이 PC의 ngrok 설정에 저장했습니다. 실제 인증 성공 여부는 외부 연결 실행 시 확인됩니다.');
}finally{muted=false;rl.close();}
