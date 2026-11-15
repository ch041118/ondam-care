import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
const DEVICE_KEY='clover.push.device';
export async function notificationDeviceId(){let {value}=await Preferences.get({key:DEVICE_KEY});if(!value){value=crypto.randomUUID();await Preferences.set({key:DEVICE_KEY,value});}return value;}
export async function setupWellnessPush({config,api,onEnable}){
  if(window.CloverExpo){window.CloverNative.pushStatus='Expo Go에서는 푸시를 사용할 수 없습니다. 오늘의 안부에서 흐름 체험을 이용해 주세요.';window.CloverNative.enablePush=async()=>{};return;}
  let listeners=false,registering=false,registrationTimer;
  const status=message=>{window.CloverNative.pushStatus=message;window.dispatchEvent(new Event('clover-push-status'));};
  const native=Capacitor.isNativePlatform();
  const report=async(permission,token='')=>api('wellness/device',{id:await notificationDeviceId(),platform:Capacitor.getPlatform(),role:config.role,elderId:config.elderId,permission,token});
  async function enable(requestPermission=true){
    if(!native||config.connection!=='server'){status('실제 기기에서 기관 서버에 연결한 뒤 푸시를 등록해 주세요.');return;}
    if(registering)return;
    if(!listeners){
      listeners=true;
      await PushNotifications.addListener('registration',async token=>{clearTimeout(registrationTimer);registering=false;try{await report('granted',token.value);status('이 기기의 푸시 알림이 서버에 등록됐습니다.');}catch{status('기기 토큰을 서버에 등록하지 못했습니다. 다시 연결해 주세요.');}});
      await PushNotifications.addListener('registrationError',async()=>{clearTimeout(registrationTimer);registering=false;status('푸시 기기 등록에 실패했습니다. Firebase 또는 APNs 설정을 확인해 주세요.');await report('error').catch(()=>{});});
      await PushNotifications.addListener('pushNotificationReceived',()=>window.dispatchEvent(new Event('clover-foreground')));
      await PushNotifications.addListener('pushNotificationActionPerformed',()=>{
        location.hash=config.role==='elder'?`elder/${config.elderId}`:'wellness';
        window.dispatchEvent(new Event('clover-foreground'));
      });
    }
    try{
      let permission=await PushNotifications.checkPermissions();
      if(permission.receive!=='granted'&&requestPermission)permission=await PushNotifications.requestPermissions();
      if(permission.receive!=='granted'){await report(permission.receive==='denied'?'denied':'prompt');status('알림 권한이 꺼져 있습니다. 기기 설정에서 알림을 허용해 주세요.');return;}
      if(Capacitor.getPlatform()==='android')await PushNotifications.createChannel({id:'clover-wellness',name:'매일 안부 확인',description:'안부 질문과 사회복지사 확인 알림',importance:4,sound:'default',visibility:0});
      registering=true;status('푸시 기기를 연결하고 있습니다.');
      registrationTimer=setTimeout(()=>{registering=false;status('푸시 등록 응답을 받지 못했습니다. 연결을 다시 확인해 주세요.');void report('error').catch(()=>{});},20000);
      await PushNotifications.register();
    }catch{clearTimeout(registrationTimer);registering=false;status('푸시 알림 설정을 확인하지 못했습니다. 다시 연결해 주세요.');await report('error').catch(()=>{});}
  }
  window.CloverNative.enablePush=async()=>{config.notifications=true;await onEnable?.();return enable(true);};
  window.CloverNative.clearCheckinNotifications=async id=>{
    if(!native)return;
    try{const delivered=await PushNotifications.getDeliveredNotifications();const notifications=delivered.notifications.filter(n=>n.data?.checkinId===id);if(notifications.length)await PushNotifications.removeDeliveredNotifications({notifications});}catch{}
  };
  if(config.notifications!==false)await enable(false);
  else status('이 기기에서 안부 알림을 사용하지 않도록 설정했습니다.');
}
