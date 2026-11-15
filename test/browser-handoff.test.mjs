import test from 'node:test';
import assert from 'node:assert/strict';
import {needsChrome,chromeIntent,chromeHandoffMarkup} from '../public/browser-handoff.js';
test('마이크: Android 카카오톡에서만 외부 브라우저로 안내한다',()=>{
 assert.equal(needsChrome('Mozilla Android Chrome/120 KAKAOTALK 26.1'),true);
 assert.equal(needsChrome('Mozilla Android Chrome/120'),false);
 assert.equal(needsChrome('iPhone KAKAOTALK'),false);
 assert.equal(needsChrome('Android KAKAOTALK',true),false);
});
test('Chrome 이동: 현재 기관 주소만 전달하고 로그인 정보와 어르신 경로는 제외한다',()=>{
 const link=chromeIntent('https://care.example.org/?token=secret#elder/person');
 assert.ok(link.startsWith('intent://care.example.org/app/#Intent;scheme=https;package=com.android.chrome;'));
 assert.ok(!link.includes('secret'));assert.ok(!link.includes('person'));
 assert.ok(link.includes(encodeURIComponent('https://care.example.org/app/')));
 assert.throws(()=>chromeIntent('javascript:alert(1)'));
});
test('Chrome 안내 화면에는 녹음 버튼 없이 명시적 이동과 계정 메뉴를 제공한다',()=>{
 const html=chromeHandoffMarkup('https://care.example.org');
 assert.ok(html.includes('Chrome에서 열기'));assert.ok(html.includes('계정 · 로그아웃'));
 assert.ok(!html.includes('id="mic"'));assert.ok(html.includes('readonly'));
});
