export function needsChrome(userAgent,isNative=false){
 return !isNative&&/Android/i.test(userAgent)&&/KAKAOTALK/i.test(userAgent);
}
export function chromeIntent(origin){
 const url=new URL('/app/',origin);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('HTTPS 앱 주소가 필요합니다.');
 // Browser cookies, session tokens, query strings and elder IDs are not copied.
 return `intent://${url.host}/app/#Intent;scheme=${url.protocol.slice(0,-1)};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.href)};end`;
}
export function chromeHandoffMarkup(origin){
 const esc=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const url=new URL('/app/',origin).href;
 return `<main class="device-setup browser-handoff"><div class="setup-logo">✤</div><h1>마이크는 Chrome에서<br>사용해 주세요.</h1><p class="subtitle">카카오톡 안에서는 마이크 허용창이 반복될 수 있어요.</p><a class="btn primary setup-start" href="${esc(chromeIntent(origin))}">Chrome에서 열기</a><p class="setup-hint">Chrome에서 한 번 더 로그인해야 할 수 있어요. 보호사가 도와주세요.</p><details><summary>Chrome이 열리지 않나요?</summary><p class="setup-hint">아래 주소를 길게 눌러 복사한 뒤, Chrome 앱의 주소창에 붙여 넣어 주세요.</p><input aria-label="Chrome에서 열 앱 주소" readonly value="${esc(url)}"></details><div class="actions"><button class="btn" data-do="settings">계정 · 로그아웃</button></div></main>`;
}
