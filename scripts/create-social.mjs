import { lockDataDirectory } from '../lib/data-lock.mjs';
import { readFileSync,writeFileSync,renameSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { ensureAuth,hashPassword,emailAddress } from '../lib/auth.mjs';
// Offline administrative provisioning; no public API can mint a social-worker role.
const dir=resolve(process.env.CLOVER_DATA_DIR||'data'),file=resolve(dir,'state.json');
if(!existsSync(file))throw Error('서버를 한 번 실행하여 데이터 파일을 만든 뒤 종료해 주세요.');
try{const r=await fetch(`http://127.0.0.1:${process.env.PORT||3000}/api/auth/config`,{signal:AbortSignal.timeout(1000)});if(r.ok)throw Error('먼저 실행 중인 클로버 서버를 종료해 주세요.');}catch(e){if(e.message.startsWith('먼저'))throw e;}
const release=lockDataDirectory(dir);
let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
const rl=createInterface({input:process.stdin,output,terminal:true});
try{const email=emailAddress(await rl.question('사회복지사 이메일: '));const name=(await rl.question('성함: ')).trim();if(!name||name.length>50)throw Error('성함을 확인해 주세요.');process.stdout.write('비밀번호 (12자 이상, 입력 내용 숨김): ');muted=true;const password=await rl.question('');muted=false;process.stdout.write('\n');process.stdout.write('비밀번호 확인: ');muted=true;const confirmation=await rl.question('');muted=false;process.stdout.write('\n');if(password!==confirmation)throw Error('비밀번호가 일치하지 않습니다.');const db=ensureAuth(JSON.parse(readFileSync(file,'utf8')));if(db.accounts.some(a=>a.email===email))throw Error('이미 존재하는 이메일입니다.');db.accounts.push({id:randomUUID(),email,name,role:'social',approvalStatus:'pending',passwordHash:await hashPassword(password),createdAt:Date.now()});writeFileSync(file+'.admin.tmp',JSON.stringify(db,null,2),{mode:0o600});renameSync(file+'.admin.tmp',file);console.log('사회복지사 가입 신청을 생성했습니다. 서버 재시작 후 관리자 계정으로 승인해 주세요.');}finally{rl.close();release();}
