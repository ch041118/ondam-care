import { isIP } from 'node:net';

export function serverConfig(env=process.env){
  const port=Number(env.PORT||3000),host=env.HOST||'127.0.0.1';
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT는 1~65535여야 합니다.');

  let publicOrigin='';
  if(env.PUBLIC_ORIGIN){
    const u=new URL(env.PUBLIC_ORIGIN);
    if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('PUBLIC_ORIGIN에는 경로 없는 HTTPS 주소를 입력해 주세요.');
    publicOrigin=u.origin;
  }
  const production=env.NODE_ENV==='production';
  let lanOrigin='';
  if(env.LAN_ORIGIN){
    const u=new URL(env.LAN_ORIGIN),parts=u.hostname.split('.').map(Number);
    const privateIP=isIP(u.hostname)===4&&(parts[0]===10||(parts[0]===172&&parts[1]>=16&&parts[1]<=31)||(parts[0]===192&&parts[1]===168));
    if(production||publicOrigin||u.protocol!=='http:'||!privateIP||u.hostname!==host||Number(u.port||80)!==port||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('LAN_ORIGIN은 개발 모드에서 HOST와 같은 사설 IP 및 PORT를 사용하는 HTTP 주소여야 합니다.');
    lanOrigin=u.origin;
  }
  if(!['127.0.0.1','0.0.0.0','::1','::'].includes(host)&&!lanOrigin)throw Error('HOST 설정을 확인해 주세요.');
  if((production||host==='0.0.0.0'||host==='::')&&!publicOrigin)throw Error('외부 배포에는 PUBLIC_ORIGIN HTTPS 주소가 필요합니다.');
  const origins=[`http://localhost:${port}`,`http://127.0.0.1:${port}`,...(publicOrigin?[publicOrigin]:[]),...(lanOrigin?[lanOrigin]:[])];
  return {port,host,production,publicOrigin,lanOrigin,origins,hosts:origins.map(o=>new URL(o).host),trustProxy:env.TRUST_PROXY==='true'};
}

// Only enable behind a proxy that overwrites/appends X-Forwarded-For and is
// the sole route to the backend. The provided Compose file exposes only Caddy.
export function clientAddress(req,trustProxy){
  const forwarded=req.headers['x-forwarded-for'];
  const address=typeof forwarded==='string'?forwarded.split(',').at(-1).trim():'';
  return trustProxy&&isIP(address)?address:req.socket.remoteAddress;
}
