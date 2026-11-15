// Handle real touch events directly on iOS. Pointer capture is optional and
// must never prevent a microphone permission request from the user gesture.
export function bindMicInput(button,{press,release},surface=window){
 let active=null,lastPhysical=0;
 const listeners=[];
 const on=(target,name,fn,options)=>{target.addEventListener(name,fn,options);listeners.push(()=>target.removeEventListener(name,fn,options));};
 const begin=(kind,id)=>{if(active||button.disabled)return;active={kind,id};lastPhysical=Date.now();press({toggle:kind==='accessible'});};
 const end=cancel=>{if(!active)return;active=null;lastPhysical=Date.now();release(cancel);};
 on(button,'touchstart',event=>{event.preventDefault();const touch=event.changedTouches[0];if(touch)begin('touch',touch.identifier);},{passive:false});
 on(surface,'touchend',event=>{if(active?.kind==='touch'&&[...event.changedTouches].some(t=>t.identifier===active.id))end(false);});
 on(surface,'touchcancel',event=>{if(active?.kind==='touch'&&[...event.changedTouches].some(t=>t.identifier===active.id))end(true);});
 on(button,'pointerdown',event=>{if(event.pointerType==='touch'||event.button>0)return;event.preventDefault();begin('pointer',event.pointerId);try{button.setPointerCapture?.(event.pointerId);}catch{};});
 on(surface,'pointerup',event=>{if(active?.kind==='pointer'&&active.id===event.pointerId)end(false);});
 on(surface,'pointercancel',event=>{if(active?.kind==='pointer'&&active.id===event.pointerId)end(true);});
 on(button,'keydown',event=>{if([' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)begin('key',event.key);}});
 on(button,'keyup',event=>{if(active?.kind==='key'&&event.key===active.id){event.preventDefault();end(false);}});
 // VoiceOver/Switch Control can activate a button without a pointer gesture.
 on(button,'click',event=>{event.preventDefault();if(Date.now()-lastPhysical<700)return;if(active?.kind==='accessible')end(false);else{begin('accessible',0);lastPhysical=0;}});
 on(button,'contextmenu',event=>event.preventDefault());
 on(surface,'blur',()=>end(true));
 return ()=>{end(true);listeners.forEach(remove=>remove());};
}
