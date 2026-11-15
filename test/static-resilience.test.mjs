import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,copyFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

test('화면 파일 누락: 오류 응답 후에도 서버가 계속 실행된다',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'clover-static-audit-')),port=38000+Math.floor(Math.random()*7000),origin=`http://127.0.0.1:${port}`;let child;
 try{
  await copyFile('server.mjs',join(dir,'server.mjs'));await cp('lib',join(dir,'lib'),{recursive:true});await mkdir(join(dir,'public'));
  child=spawn(process.execPath,['server.mjs'],{cwd:dir,env:{...process.env,NODE_ENV:'development',HOST:'127.0.0.1',PORT:String(port),CLOVER_DATA_DIR:join(dir,'data'),PUBLIC_ORIGIN:'',LAN_ORIGIN:'',STT_URL:'',OLLAMA_MODEL:''},windowsHide:true,stdio:['ignore','ignore','pipe']});
  let startupError='';child.stderr.on('data',part=>{startupError+=part;});
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/health')).ok){ready=true;break;}}catch{}if(child.exitCode!==null)break;await delay(50);}
  assert.ok(ready,'격리 서버가 시작되어야 함: '+startupError);
  const missing=await fetch(origin+'/style.css');assert.equal(missing.status,404);assert.match((await missing.json()).error,/화면 파일/);
  assert.equal((await fetch(origin+'/api/health')).status,200);
  await writeFile(join(dir,'public','style.css'),'body{color:green}');
  const restored=await fetch(origin+'/style.css');assert.equal(restored.status,200);assert.match(restored.headers.get('content-type'),/text\/css/);assert.equal(await restored.text(),'body{color:green}');
 }finally{
  if(child&&child.exitCode===null){const exit=once(child,'exit');child.kill();await exit;}
  assert.equal(dirname(resolve(dir)),resolve(tmpdir()));assert.ok(basename(dir).startsWith('clover-static-audit-'));await rm(dir,{recursive:true,force:true});
 }
});
