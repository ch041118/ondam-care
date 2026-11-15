import {brandArt} from './brand-art.js';

// One entrance per document; route changes and background/foreground do not replay it.
if(!window.__cloverIntroShown){
 window.__cloverIntroShown=true;
 const splash=document.createElement('div');
 splash.className='clover-intro';
 splash.setAttribute('aria-hidden','true');
 splash.innerHTML=`<div class="clover-intro-art">${brandArt('ko')}<p>말로 전하는 일상 부탁</p></div>`;
 document.body.append(splash);
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let timer;
 const dismiss=()=>{clearTimeout(timer);splash.remove();window.removeEventListener('pointerdown',dismiss,true);window.removeEventListener('keydown',dismiss,true);};
 window.addEventListener('pointerdown',dismiss,{capture:true,once:true});
 window.addEventListener('keydown',dismiss,{capture:true,once:true});
 timer=setTimeout(dismiss,reduced?600:1800);
}
