import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['mobile/main.js'], define:{__CLOVER_PACKAGED__:'true'}, bundle: true, outfile: 'dist/app.js', format: 'esm', target: ['chrome109', 'safari15'], sourcemap: false, minify: true });
const html = (await readFile('public/index.html', 'utf8')).replace('href="/style.css"', 'href="./style.css"').replace('src="/app.js"', 'src="./app.js"');
await writeFile('dist/index.html', html);
await copyFile('public/style.css', 'dist/style.css');
console.log('Android/iOS shared app bundle ready: dist/');
