import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
const java=process.env.JAVA_HOME?resolve(process.env.JAVA_HOME,'bin',process.platform==='win32'?'java.exe':'java'):'java';
const version=spawnSync(java,['-version'],{encoding:'utf8'});
if(version.error||version.status!==0){console.error('Android APK 빌드에는 JDK 21이 필요합니다. Android Studio 설치 후 JAVA_HOME을 포함된 jbr 폴더로 설정하세요. docs/MOBILE.md를 참고하세요.');process.exit(1);}
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
if(!sdk&&!existsSync('android/local.properties')){console.error('Android SDK 36 경로가 필요합니다. Android Studio에서 android/ 프로젝트를 열거나 ANDROID_HOME을 설정하세요.');process.exit(1);}
const result=spawnSync(process.platform==='win32'?'gradlew.bat':'sh',process.platform==='win32'?['assembleDebug']:['./gradlew','assembleDebug'],{cwd:resolve('android'),stdio:'inherit',shell:process.platform==='win32'});
if(result.status!==0)process.exit(result.status||1);
mkdirSync('artifacts',{recursive:true});copyFileSync('android/app/build/outputs/apk/debug/app-debug.apk','artifacts/clover-android-debug.apk');
console.log('APK: artifacts/clover-android-debug.apk');
