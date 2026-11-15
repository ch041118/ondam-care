import {startLocalVoice} from './local-voice.mjs';
export async function startWithVoice(root){
 const startup=new AbortController();
 const cancel=()=>startup.abort();
 process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 let stop=()=>{};
 try{
  stop=await startLocalVoice(root,{signal:startup.signal});
  startup.signal.throwIfAborted();
  await import('../server.mjs');
  // A signal can arrive while the server module is loading, before its handlers exist.
  if(startup.signal.aborted)process.exit(0);
 }catch(e){stop();if(!startup.signal.aborted)throw e;}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
