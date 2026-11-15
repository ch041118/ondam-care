const sessionThemes=new Map();
export function themeStorage(){try{return window.localStorage;}catch{return null;}}
export function readStaffTheme(storage,userId='demo'){
 if(sessionThemes.has(userId))return sessionThemes.get(userId);
 try{return storage.getItem('clover.theme.'+userId)==='dark'?'dark':'light';}catch{return 'light';}
}
export function saveStaffTheme(storage,userId,theme){
 sessionThemes.set(userId||'demo',theme==='dark'?'dark':'light');
 try{storage.setItem('clover.theme.'+(userId||'demo'),theme==='dark'?'dark':'light');}catch{}
}
export function screenTheme(role,elderScreen,preference){return !elderScreen&&['social','caregiver','admin'].includes(role)&&preference==='dark'?'dark':'light';}
export function applyTheme(root,theme){root.dataset.theme=theme;root.style.colorScheme=theme;}
