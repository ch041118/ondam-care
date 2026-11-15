import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPcConfig,checkPublicAccounts} from '../lib/public-pc.mjs';
import {hashPassword} from '../lib/auth.mjs';
test('수동 외부 실행: 실제 무료 HTTPS 주소만 사용하고 PC 내부에 바인딩',()=>{
 assert.throws(()=>publicPcConfig({}));
 for(const PUBLIC_ORIGIN of ['https://your-assigned-name.ngrok-free.app','http://real-name.ngrok-free.app','https://real-name.ngrok-free.app/steal','https://real-name.ngrok-free.app.evil.test'])assert.throws(()=>publicPcConfig({PUBLIC_ORIGIN}));
 const config=publicPcConfig({PUBLIC_ORIGIN:'https://my-care.ngrok-free.dev',HOST:'0.0.0.0',LAN_ORIGIN:'http://192.168.1.2:3000'});assert.equal(config.host,'127.0.0.1');assert.equal(config.production,true);assert.equal(config.lanOrigin,'');
});
test('수동 외부 실행: 알려진 관리자 비밀번호의 공개를 차단하고 계정은 수정하지 않는다',async()=>{
 const db={accounts:[{role:'admin',passwordHash:await hashPassword('adminpassword')}]};const before=JSON.stringify(db);
 await assert.rejects(checkPublicAccounts(db));assert.equal(JSON.stringify(db),before);
 await checkPublicAccounts({accounts:[{role:'admin',passwordHash:await hashPassword('Unique-live-passphrase-2026')}]});
});
