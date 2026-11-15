import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {hostedPage} from '../lib/hosted-page.mjs';

test('아이폰 첫 화면: 외부 실행 파일 없이 렌더링하고 정확한 스크립트 해시만 허용한다',()=>{
 const html=readFileSync(new URL('../public/hosted.html',import.meta.url),'utf8');
 const boot='window.ready=true;',app='var literal="</script><script>alert(1)</script>";var text="$&";';
 const {body,policy}=hostedPage({html,css:'body{color:green}',boot,app});
 assert.ok(!body.includes('<script src='));assert.ok(!body.includes('<script defer src='));
 assert.ok(!body.includes('<link rel="stylesheet"'));assert.ok(body.includes('body{color:green}'));
 const scripts=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 assert.equal(scripts.length,2);assert.equal(scripts[0],boot);assert.ok(scripts[1].includes('$&'));
 assert.ok(scripts[1].includes('<\\/script>'));
 for(const script of scripts)assert.ok(policy.includes("'sha256-"+createHash('sha256').update(script).digest('base64')+"'"));
 assert.ok(!policy.split(';').find(part=>part.includes('script-src')).includes('unsafe-inline'));
 assert.ok(policy.includes("connect-src 'self'"));
});
