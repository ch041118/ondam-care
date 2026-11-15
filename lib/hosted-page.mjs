import {createHash} from 'node:crypto';

// Deliver the first screen atomically. No extra asset request is needed before
// login can render, even when a tunnel or browser blocks a script request.
export function hostedPage({html,css,boot,app}) {
 const scripts=[boot,app].map(source=>source.replace(/<\/script/gi,'<\\/script'));
 const hashes=scripts.map(source=>"'sha256-"+createHash('sha256').update(source).digest('base64')+"'");
 const body=html
  .replace('<link rel="stylesheet" href="/style.css">','<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>')
  .replace('<script src="/boot-status.js"></script>',()=>'<script>'+scripts[0]+'</script>')
  .replace(/<script defer src="\/web-app\.js[^\"]*"><\/script>/,()=>'<script>'+scripts[1]+'</script>');
 return {body,policy:"default-src 'self'; script-src 'self' "+hashes.join(' ')+"; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
}
