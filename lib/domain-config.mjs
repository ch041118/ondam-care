import {isIP} from 'node:net';
import {serverConfig} from './server-config.mjs';

export function domainConfig(env) {
  const domain=String(env.CLOVER_DOMAIN||'').trim().toLowerCase();
  const labels=domain.split('.');
  if(domain.length>253||labels.length<2||isIP(domain)||labels.some(s=>! /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(s))||/\.(test|invalid|localhost|local|internal|example)$/.test(domain)||/(^|\.)example\.(com|org|net)$/.test(domain))throw Error('CLOVER_DOMAIN에 구매한 실제 도메인을 입력해 주세요. https://, 포트, 경로는 제외합니다.');
  const config=serverConfig({...env,NODE_ENV:'production',HOST:'127.0.0.1',LAN_ORIGIN:'',PUBLIC_ORIGIN:`https://${domain}`,TRUST_PROXY:'true'});
  return {...config,domain};
}
