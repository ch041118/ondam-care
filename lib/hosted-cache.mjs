import {stat,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
import {hostedPage} from './hosted-page.mjs';

const compress=promisify(gzip);
// Only public UI assets are cached. Authenticated API responses are never shared.
export function createHostedCache(directory){
 const names=['hosted.html','style.css','boot-status.js','web-app.js'];
 let key='',pending;
 return async()=>{
  const files=names.map(name=>resolve(directory,name));
  const metadata=await Promise.all(files.map(file=>stat(file)));
  const next=metadata.map(s=>`${s.mtimeMs}:${s.ctimeMs}:${s.size}`).join('|');
  if(next!==key||!pending){
   key=next;
   const current=(async()=>{
    const [html,css,boot,app]=await Promise.all(files.map(file=>readFile(file,'utf8')));
    const page=hostedPage({html,css,boot,app});
    return {...page,gzip:await compress(page.body)};
   })();
   pending=current;
   current.catch(()=>{if(pending===current){pending=undefined;key='';}});
  }
  return pending;
 };
}
export function acceptsGzip(header=''){
 return header.split(',').some(part=>{
  const [name,...params]=part.trim().toLowerCase().split(';');
  const quality=params.find(p=>p.trim().startsWith('q='));
  return name==='gzip'&&(!quality||Number(quality.trim().slice(2))>0);
 });
}
