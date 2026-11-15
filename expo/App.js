import {apiHeaders,readApiResponse} from '../public/http-response.js';
import React,{useEffect,useRef,useState,useMemo} from 'react';
import {AppState,BackHandler,Platform,StyleSheet,Text,View,TextInput,Pressable,ScrollView,ActivityIndicator,Linking} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import {AudioModule,RecordingPresets,setAudioModeAsync,useAudioRecorder} from 'expo-audio';
import {File} from 'expo-file-system';
import * as Speech from 'expo-speech';
import {webOrigin,apiTarget,trustedPage} from './bridge-policy.mjs';
import {createPushClient} from './push-client.mjs';
const ORIGIN_KEY='clover.web.origin',SESSION_KEY='clover.session';
const expoGo=Constants.executionEnvironment==='storeClient';
export default function App(){
 const nativeScreen=useRef(true);
 const web=useRef(null),origin=useRef(''),page=useRef(0),ready=useRef(false),pendingNotification=useRef(false),authVersion=useRef(0);
 const nativeMicTimer=useRef(null);
 const active=useRef(AppState.currentState==='active'),recording=useRef(false),started=useRef(0),audioQueue=useRef(Promise.resolve());
 const [server,setServer]=useState(null),[input,setInput]=useState(''),[settings,setSettings]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pageFailed,setPageFailed]=useState(false),[revision,setRevision]=useState(0),[pushMessage,setPushMessage]=useState('');
 const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY);
 const inject=code=>web.current?.injectJavaScript(code+';true;');
 const emit=name=>inject(`window.dispatchEvent(new Event(${JSON.stringify('clover-native-'+name)}))`);
 const queueAudio=fn=>{const next=audioQueue.current.then(fn);audioQueue.current=next.catch(()=>{});return next;};
 async function stopAudio(){clearTimeout(nativeMicTimer.current);if(recording.current){try{await recorder.stop();}finally{recording.current=false;await setAudioModeAsync({allowsRecording:false}).catch(()=>{});}}}
 async function cancelAudio(){await stopAudio();if(recorder.uri){try{new File(recorder.uri).delete();}catch{}}}
 async function clearSession(){authVersion.current++;await SecureStore.deleteItemAsync(SESSION_KEY);pendingNotification.current=false;await push.current?.clear().catch(()=>{});}
 async function request(path,method='GET',body){
  const target=origin.current,url=apiTarget(target,path,method),version=authVersion.current;
  const session=JSON.parse(await SecureStore.getItemAsync(SESSION_KEY)||'null');
  const headers=apiHeaders({'Content-Type':'application/json','X-Clover-Client':'native'});
  if(session?.server===target)headers.Authorization='Bearer '+session.token;
  const response=await fetch(url,{method,headers,credentials:'omit',redirect:'error',body:method==='POST'?JSON.stringify(body||{}):undefined,signal:AbortSignal.timeout(path==='/api/voice-json'?130000:path.startsWith('/api/agent/')?240000:20000)});
  const data=await readApiResponse(response);
  if(version===authVersion.current&&origin.current===target){
   if(response.ok&&data.token&&['/api/auth/login','/api/auth/register','/api/auth/pair'].includes(path)){authVersion.current++;await SecureStore.setItemAsync(SESSION_KEY,JSON.stringify({server:target,token:data.token}),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
   if((response.status===401&&['/api/auth/me','/api/state'].includes(path))||(response.ok&&['/api/auth/logout','/api/auth/password'].includes(path)))await clearSession();
  }
  delete data.token;return {status:response.status,data};
 }
 const push=useRef(null);if(!push.current)push.current=createPushClient({platform:Platform.OS,isExpoGo:expoGo,read:k=>AsyncStorage.getItem(k),write:(k,v)=>AsyncStorage.setItem(k,v),uuid:()=>Crypto.randomUUID(),api:async(path,body)=>{const r=await request('/api/'+path,body?'POST':'GET',body);if(r.status>=400)throw Error(r.data.error);return r.data;},onStatus:setPushMessage,onNotification:tapped=>{if(tapped){if(ready.current)emit('notification');else pendingNotification.current=true;}else if(ready.current)emit('active');}});
 useEffect(()=>{let disposed=false;(async()=>{let saved=await AsyncStorage.getItem(ORIGIN_KEY);if(!saved)saved=process.env.EXPO_PUBLIC_CLOVER_WEB_URL||'';if(disposed)return;try{const value=saved?webOrigin(saved,__DEV__):'';origin.current=value;setServer(value);setInput(value);setSettings(!value);}catch{setServer('');setSettings(true);}})().catch(()=>{setServer('');setSettings(true);setError('기기 설정을 읽지 못했습니다.');});
  void push.current.listen().catch(()=>setPushMessage('기기 알림 설정을 확인해 주세요.'));
  const state=AppState.addEventListener('change',value=>{active.current=value==='active';if(active.current)emit('active');else{emit('inactive');void queueAudio(cancelAudio);void Speech.stop();}});
  const back=BackHandler.addEventListener('hardwareBackPress',()=>{if(nativeScreen.current){if(origin.current){setSettings(false);setPageFailed(false);setRevision(v=>v+1);}else BackHandler.exitApp();}else emit('back');return true;});
  return()=>{disposed=true;state.remove();back.remove();push.current.dispose();void queueAudio(cancelAudio);void Speech.stop();};
 },[]);
 async function connect(){setBusy(true);setError('');try{const next=webOrigin(input.trim(),__DEV__);if(origin.current&&next!==origin.current){const existing=await SecureStore.getItemAsync(SESSION_KEY);if(existing){const r=await request('/api/auth/logout','POST',{});if(r.status!==401&&r.status>=400)throw Error(r.data.error);await clearSession();}}
  await AsyncStorage.setItem(ORIGIN_KEY,next);origin.current=next;ready.current=false;setServer(next);setSettings(false);setPageFailed(false);setRevision(v=>v+1);
 }catch(e){setError(e.message||'서버 주소를 확인해 주세요.');}finally{setBusy(false);}}
 async function handle(method,args){
  switch(method){
   case 'api':return request(args.path,args.method,args.body);
   case 'ready':ready.current=true;if(pendingNotification.current){pendingNotification.current=false;emit('notification');}return {};
   case 'auth.clear':await clearSession();return {};
   case 'settings':await queueAudio(cancelAudio);await Speech.stop();ready.current=false;setSettings(true);return {};
   case 'phone.call':{const phone=String(args.phone||'');if(!/^\+?\d{8,15}$/.test(phone))throw Error('전화번호를 확인해 주세요.');await Linking.openURL('tel:'+phone);return {};}
   case 'exit':BackHandler.exitApp();return {};
   case 'speech.stop':await Speech.stop();return {};
   case 'speech.speak':Speech.speak(String(args.text||'').slice(0,2000),{language:'ko-KR',rate:.85});return {};
   case 'audio.request':{const permission=await AudioModule.getRecordingPermissionsAsync();if(permission.granted||permission.canAskAgain===false)return permission;return AudioModule.requestRecordingPermissionsAsync();}
   case 'audio.start':return queueAudio(async()=>{if(!active.current)throw Error('앱을 다시 열고 말씀해 주세요.');await setAudioModeAsync({allowsRecording:true,playsInSilentMode:true});await recorder.prepareToRecordAsync();if(!active.current){await recorder.stop();await setAudioModeAsync({allowsRecording:false});throw Error('녹음을 취소했습니다.');}recorder.record();recording.current=true;started.current=Date.now();nativeMicTimer.current=setTimeout(()=>{void queueAudio(cancelAudio);emit('inactive');},65000);return {};});
   case 'audio.stop':return queueAudio(async()=>{const duration=Date.now()-started.current;await stopAudio();if(!recorder.uri)throw Error('녹음 파일이 없습니다.');const file=new File(recorder.uri);try{if(file.size>7*1024*1024)throw Error('녹음이 너무 길어요.');return {duration,base64:await file.base64()};}finally{file.delete();}});
   case 'audio.cancel':await queueAudio(cancelAudio);return {};
   case 'push.sync':return push.current.sync({requestPermission:Boolean(args.requestPermission),enable:Boolean(args.enable)});
   case 'push.clear':await push.current.clear(String(args.id||''));return {};
   default:throw Error('지원하지 않는 앱 기능입니다.');
  }
 }
 async function onMessage(event){if(!trustedPage(origin.current,event.nativeEvent.url))return;const epoch=page.current;let msg;try{msg=JSON.parse(event.nativeEvent.data);if(!Number.isSafeInteger(msg.id)||typeof msg.method!=='string')return;const value=await handle(msg.method,msg.args||{});if(epoch===page.current)inject(`window.cloverBridgeReply?.(${JSON.stringify({id:msg.id,value})})`);}catch(e){if(msg?.id&&epoch===page.current)inject(`window.cloverBridgeReply?.(${JSON.stringify({id:msg.id,error:e.message||'앱 기능을 사용할 수 없습니다.'})})`);}}
 nativeScreen.current=settings||!server||pageFailed;
 const source=useMemo(()=>server?{uri:server+'/app/',headers:{'ngrok-skip-browser-warning':'1'}}:null,[server]);
 const button=(title,fn,secondary=false)=><Pressable disabled={busy} style={[styles.button,secondary&&styles.secondary]} onPress={fn}><Text style={[styles.buttonText,secondary&&styles.secondaryText]}>{title}</Text></Pressable>;
 return <SafeAreaProvider><SafeAreaView style={styles.page} edges={['top','bottom']}>
 {server===null?<ActivityIndicator size="large" color="#42644b"/>:settings||!server?<ScrollView contentContainerStyle={styles.setup} keyboardShouldPersistTaps="handled"><Text style={styles.brand}>clover.</Text><Text style={styles.title}>늘 가까이, 따뜻한 돌봄</Text><Text style={styles.description}>처음 한 번, 담당자가 기관의 웹 주소를 연결해 주세요. 로그인은 다음에도 유지됩니다.</Text><Text style={styles.label}>기관 웹 주소</Text><TextInput accessibilityLabel="기관 웹 주소" style={styles.input} value={input} onChangeText={setInput} placeholder="https://care.example.org" keyboardType="url" autoCapitalize="none" autoCorrect={false}/>{button(busy?'연결 중…':'웹앱 열기',connect)}{server&&button('기존 화면으로 돌아가기',()=>{setSettings(false);setPageFailed(false);setRevision(v=>v+1);},true)}<Text accessibilityLiveRegion="polite" style={styles.description}>{error}</Text>{server?<><Text style={styles.label}>이 기기의 알림</Text><Text style={styles.description}>{pushMessage||'로그인한 뒤 알림을 연결할 수 있습니다.'}</Text>{button('알림 연결하기',async()=>{setBusy(true);try{await push.current.sync({requestPermission:true,enable:true});}finally{setBusy(false);}},true)}{button('이 기기 알림 끄기',async()=>{try{await push.current.disable();}catch{setPushMessage('서버에 연결한 뒤 다시 시도해 주세요.');}},true)}{button('휴대폰 알림 권한 설정',()=>Linking.openSettings(),true)}</>:null}{expoGo?<Text style={styles.description}>Expo Go에서는 웹 화면과 로그인 유지·녹음을 테스트할 수 있습니다. 원격 알림은 개발용 설치 앱에서 지원합니다.</Text>:null}</ScrollView>:pageFailed?<View style={styles.setup}><Text style={styles.title}>인터넷 연결을 확인해 주세요.</Text><Text style={styles.description}>연결되면 같은 계정으로 다시 열 수 있습니다.</Text>{button('다시 연결',()=>{setPageFailed(false);setRevision(v=>v+1);})}{button('담당자 연결 설정',()=>setSettings(true),true)}</View>:<WebView key={revision} ref={web} source={source} userAgent="CloverCare/0.3" onMessage={onMessage} javaScriptEnabled domStorageEnabled originWhitelist={['*']} mixedContentMode="never" allowFileAccess={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} setSupportMultipleWindows={true} onOpenWindow={()=>{}} onShouldStartLoadWithRequest={r=>trustedPage(origin.current,r.url)} onLoadStart={()=>{page.current++;ready.current=false;void queueAudio(cancelAudio);void Speech.stop();}} onError={()=>{ready.current=false;setPageFailed(true);}} onHttpError={e=>{if(e.nativeEvent.statusCode>=400&&trustedPage(origin.current,e.nativeEvent.url))setPageFailed(true);}} onContentProcessDidTerminate={()=>{ready.current=false;web.current?.reload();}} startInLoadingState renderLoading={()=><ActivityIndicator size="large" color="#42644b"/>} style={styles.page}/>}
 </SafeAreaView></SafeAreaProvider>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#f6f7f2'},setup:{padding:28,paddingTop:50,gap:12},brand:{fontSize:32,fontWeight:'800',color:'#42644b'},title:{fontSize:26,fontWeight:'700',color:'#263b2c',marginTop:16},description:{fontSize:15,lineHeight:23,color:'#687468'},label:{fontSize:16,fontWeight:'600',marginTop:14,color:'#263b2c'},input:{backgroundColor:'white',borderWidth:1,borderColor:'#cdd8ca',borderRadius:12,padding:16,fontSize:16},button:{backgroundColor:'#42644b',padding:16,borderRadius:12,alignItems:'center'},buttonText:{color:'white',fontWeight:'600',fontSize:16},secondary:{backgroundColor:'#e6ece1'},secondaryText:{color:'#42644b'}});
