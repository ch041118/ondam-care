import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHostedCache,acceptsGzip} from '../lib/hosted-cache.mjs';

test('public page cache shares work, preserves compressed content and refreshes changed files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'clover-assets-'));
 try{
  const files={'hosted.html':'<link rel="stylesheet" href="/style.css"><script src="/boot-status.js"></script><script defer src="/web-app.js"></script>','style.css':'body{color:green}','boot-status.js':'window.ready=true;','web-app.js':'window.app=true;'};
  await Promise.all(Object.entries(files).map(([name,value])=>writeFile(join(dir,name),value)));
  const read=createHostedCache(dir);
  const [first,concurrent]=await Promise.all([read(),read()]);
  assert.equal(first,concurrent);
  assert.equal(await read(),first);
  assert.equal(gunzipSync(first.gzip).toString(),first.body);
  await writeFile(join(dir,'web-app.js'),'window.app="updated";');
  const updated=await read();
  assert.notEqual(updated,first);
  assert.notEqual(updated.policy,first.policy);
  assert.ok(updated.body.includes('updated'));
  await rm(join(dir,'style.css'));
  await assert.rejects(read());
  await writeFile(join(dir,'style.css'),'body{color:blue}');
  assert.ok((await read()).body.includes('color:blue'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('gzip negotiation respects clients that disable or do not support gzip',()=>{
 for(const h of [undefined,'','br','gzip;q=0','gzip;q=0.0, br'])assert.equal(acceptsGzip(h),false);
 for(const h of ['gzip','br, gzip','gzip; q=0.5'])assert.equal(acceptsGzip(h),true);
});
