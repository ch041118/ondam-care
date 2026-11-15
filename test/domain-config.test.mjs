import test from 'node:test';
import assert from 'node:assert/strict';
import {domainConfig} from '../lib/domain-config.mjs';

test('도메인 실행은 HTTPS와 로컬 바인딩을 강제하고 ngrok 주소를 대체한다',()=>{
  const config=domainConfig({CLOVER_DOMAIN:' Care.My-Clover.Kr ',HOST:'0.0.0.0',PUBLIC_ORIGIN:'https://old.ngrok-free.dev',LAN_ORIGIN:'http://192.168.1.2:3000'});
  assert.equal(config.publicOrigin,'https://care.my-clover.kr');
  assert.equal(config.host,'127.0.0.1');
  assert.equal(config.production,true);
  assert.equal(config.trustProxy,true);
  assert.equal(config.lanOrigin,'');
  assert.ok(!config.hosts.includes('old.ngrok-free.dev'));
});
test('도메인 실행은 경로·설정 삽입·예제·IP 주소를 거부한다',()=>{
  for(const domain of ['', 'care.example.org','127.0.0.1','localhost','app.local','foo.test','https://care.clover.kr','care.clover.kr:443','care.clover.kr/path','care.clover.kr\n{','*.clover.kr','-app.clover.kr','app..kr'])assert.throws(()=>domainConfig({CLOVER_DOMAIN:domain}),domain);
});
