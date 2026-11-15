import { existsSync,readFileSync,writeFileSync,unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const held=new Set();
function processStartedAt(pid){
  if(process.platform!=='win32'||!Number.isSafeInteger(pid)||pid<=0)return null;
  try{
    const command=`$p=Get-Process -Id ${pid} -ErrorAction Stop; ([DateTimeOffset]$p.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()`;
    const value=Number(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true,timeout:5000,stdio:['ignore','pipe','ignore']}).trim());
    return Number.isFinite(value)&&value>0?value:null;
  }catch{return null;}
}
export function lockDataDirectory(directory,{startedAt=processStartedAt}={}){
  const file=resolve(directory,'.clover-writer.lock');
  if(existsSync(file)){
    let previous;try{previous=JSON.parse(readFileSync(file,'utf8'));}catch{throw Error('데이터 저장소 잠금 파일을 확인해 주세요.');}
    let alive=true;try{process.kill(previous.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}
    // A new process with the old PID cannot own a lock written before it started.
    if(alive&&previous.pid!==process.pid){
      const actualStart=startedAt(previous.pid);
      if(Number.isFinite(previous.createdAt)&&actualStart!==null&&actualStart>previous.createdAt+1000)alive=false;
    }
    if(previous.pid===process.pid&&!held.has(file))alive=false;
    if(alive)throw Error('같은 데이터 저장소를 사용하는 서버 또는 계정 관리 명령이 실행 중입니다. 먼저 종료해 주세요.');
    unlinkSync(file);
  }
  const owner=randomUUID();
  writeFileSync(file,JSON.stringify({pid:process.pid,createdAt:Date.now(),owner}),{flag:'wx',mode:0o600});
  held.add(file);
  const release=()=>{try{if(JSON.parse(readFileSync(file,'utf8')).owner===owner){unlinkSync(file);held.delete(file);}}catch{}};
  process.once('exit',release);return release;
}
