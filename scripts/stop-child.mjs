import {spawnSync} from 'node:child_process';
// Only a child created by this launcher is eligible; never kill by program name.
export function stopChild(child,{platform=process.platform,run=spawnSync}={}){
 if(!child?.pid||child.exitCode!==null||child.signalCode||child.killed)return;
 if(platform==='win32'){
  run('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore',timeout:5000});
 }else child.kill();
}
