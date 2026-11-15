import {build} from 'esbuild';
import {resolve} from 'node:path';
await build({
 entryPoints:['public/hosted.js'],bundle:true,outfile:'public/web-app.js',format:'iife',
 target:['safari15','chrome109'],minify:true,sourcemap:false,
 plugins:[{name:'shared-recorder',setup(builder){builder.onResolve({filter:/^\.\/hold-recorder\.js$/},()=>({path:resolve('mobile/core.mjs')}));}}]
});
console.log('Safari compatible web bundle ready');
