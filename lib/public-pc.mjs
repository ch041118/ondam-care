import {serverConfig} from './server-config.mjs';
import {verifyPassword} from './auth.mjs';
export function publicPcConfig(env){
 const config=serverConfig({...env,HOST:'127.0.0.1',LAN_ORIGIN:'',NODE_ENV:'production'});
 if(!/^https:\/\/[a-z0-9-]+\.ngrok-free\.(app|dev)$/.test(config.publicOrigin)||config.publicOrigin.includes('your-assigned-name.'))throw Error('ngrok 계정에 실제로 할당된 무료 HTTPS 주소를 PUBLIC_ORIGIN에 입력해 주세요.');
 return config;
}
export async function checkPublicAccounts(db){
 for(const a of db.accounts||[])if(a.role==='admin'&&!a.disabled&&await verifyPassword('adminpassword',a.passwordHash))throw Error('외부 공개 전에 앱의 내 계정에서 관리자 비밀번호를 변경해 주세요. 로컬 계정은 변경하지 않았습니다.');
}
