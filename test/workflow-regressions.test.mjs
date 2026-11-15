import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {build} from 'esbuild';
import {lockDataDirectory} from '../lib/data-lock.mjs';
import {brandImage} from '../lib/brand-image.mjs';

test('잠금은 재사용된 PID만 복구하고 살아 있는 소유자와 확인 불가 상태는 보호한다',()=>{
 const dir=mkdtempSync(join(tmpdir(),'clover-lock-regression-'));
 const file=join(dir,'.clover-writer.lock');
 try{
  writeFileSync(file,JSON.stringify({pid:process.ppid,createdAt:10000}));
  assert.throws(()=>lockDataDirectory(dir,{startedAt:()=>9000}));
  assert.throws(()=>lockDataDirectory(dir,{startedAt:()=>null}));
  const oldRelease=lockDataDirectory(dir,{startedAt:()=>12000});
  oldRelease();
  const release=lockDataDirectory(dir);
  oldRelease();assert.ok(existsSync(file));
  assert.throws(()=>lockDataDirectory(dir));
  release();assert.equal(existsSync(file),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('온담 로고는 패키지와 웹에서 외부 이미지 없이 표시된다',async()=>{
 for(const packaged of [true,false]){
  const result=await build({entryPoints:['public/brand-art.js'],bundle:true,write:false,format:'cjs',define:{__CLOVER_PACKAGED__:String(packaged)}});
  const context={module:{exports:{}},window:{}};vm.createContext(context);
  vm.runInContext(result.outputFiles[0].text,context);
  for(const loggedIn of [false,true]){
   context.window.CloverNative=loggedIn?{}:undefined;
   const markup=context.module.exports.brandArt('ko');
   assert.match(markup,/온담/);assert.doesNotMatch(markup,/brand-image|base64/);
   
  }
 }
});

test('공개 소스에 이미지가 없어도 안전한 글자 로고로 응답한다',()=>{
 const dir=mkdtempSync(join(tmpdir(),'clover-brand-regression-'));
 try{
  const svg=brandImage(join(dir,'missing.png'),'<script>');
  assert.match(svg,/온담/);assert.doesNotMatch(svg,/<script>|base64/);
  assert.match(brandImage(join(dir,'missing.png'),'en'),/Ondam/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

