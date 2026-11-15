// Raw FCM/APNs tokens reuse the existing server push provider. Expo Go does not
// import the remote-push module; installed development/release builds do.
export function createPushClient({api,read,write,uuid,platform,isExpoGo,onNotification,onStatus,loadNotifications=()=>import('expo-notifications')}){
 let module,subscriptions=[],busy=false,last={message:'알림 연결을 준비하고 있습니다.'};
 const status=message=>{last={message};onStatus?.(message);return last;};
 const get=async()=>module||(module=await loadNotifications());
 const deviceId=async()=>{let id=await read('clover.push.device');if(!id){id=uuid();await write('clover.push.device',id);}return id;};
 async function sync({requestPermission=false,enable=false}={}){
  if(isExpoGo)return status('Expo Go에서는 원격 알림을 지원하지 않습니다. 개발용 설치 앱에서 테스트해 주세요.');
  if(busy)return last;busy=true;
  try{
   if(enable)await write('clover.push.enabled','true');
   if(await read('clover.push.enabled')==='false')return status('이 기기의 알림이 꺼져 있습니다.');
   const {user}=await api('auth/me'),n=await get();
   if(platform==='android')await n.setNotificationChannelAsync('clover-wellness',{name:'매일 안부 확인',importance:n.AndroidImportance.HIGH,sound:'default'});
   let permission=await n.getPermissionsAsync();
   if(!permission.granted&&permission.canAskAgain&&requestPermission)permission=await n.requestPermissionsAsync();
   const granted=permission.granted||Boolean(permission.ios&&permission.ios.status===n.IosAuthorizationStatus?.PROVISIONAL);
   const body={id:await deviceId(),platform,role:user.role,elderId:user.elderId};
   if(!granted){await api('wellness/device',{...body,permission:permission.status==='denied'?'denied':'prompt'});return status('알림 권한이 꺼져 있습니다. 휴대폰 설정에서 알림을 허용해 주세요.');}
   try{const token=await n.getDevicePushTokenAsync();await api('wellness/device',{...body,permission:'granted',token:String(token.data)});return status('이 기기를 안부 알림에 연결했습니다.');}
   catch(e){await api('wellness/device',{...body,permission:'error'}).catch(()=>{});return status('알림 등록에 실패했습니다. 앱의 Firebase/APNs 설정을 확인해 주세요.');}
  }catch{return status('로그인 또는 서버 연결을 확인한 뒤 알림을 다시 연결해 주세요.');}finally{busy=false;}
 }
 async function listen(){if(isExpoGo)return;const n=await get();n.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
  const handle=async response=>{const id=response?.notification?.request?.identifier;if(!id||await read('clover.push.last-response')===id)return;await write('clover.push.last-response',id);onNotification(true);await n.clearLastNotificationResponseAsync?.();};
  subscriptions=[n.addNotificationReceivedListener(()=>onNotification(false)),n.addNotificationResponseReceivedListener(response=>void handle(response)),n.addPushTokenListener(()=>void sync())];
  const initial=await n.getLastNotificationResponseAsync();if(initial)await handle(initial);
 }
 return {sync,listen,dispose:()=>subscriptions.forEach(s=>s.remove()),disable:async()=>{await api('wellness/device-disable',{id:await deviceId()});await write('clover.push.enabled','false');return status('이 기기의 알림을 껐습니다.');},clear:async id=>{if(isExpoGo)return;const n=await get();for(const item of await n.getPresentedNotificationsAsync())if(!id||item.request.content.data?.checkinId===id)await n.dismissNotificationAsync(item.request.identifier);}};
}
