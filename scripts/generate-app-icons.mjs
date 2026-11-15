import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=buffer=>{let crc=0xffffffff;for(const byte of buffer)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
function chunk(type,data){const name=Buffer.from(type),body=Buffer.concat([name,data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc32(body),out.length-4);return out;}
function png(size,splash=false){
  const bytes=Buffer.alloc((size*3+1)*size),bg=splash?[246,248,240]:[66,102,77],fg=splash?[66,102,77]:[246,248,240];
  const scale=splash?.30:1;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x/size-.5)/scale,dy=(y/size-.5)/scale;
    const inPetal=[[-.11,-.11],[.11,-.11],[-.11,.11],[.11,.11]].some(([cx,cy])=>(dx-cx)**2+(dy-cy)**2<.137**2);
    const color=inPetal?fg:bg,index=y*(size*3+1)+1+x*3;
    bytes[index]=color[0];bytes[index+1]=color[1];bytes[index+2]=color[2];
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=2;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(bytes)),chunk('IEND',Buffer.alloc(0))]);
}
writeFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',png(1024));
const splash=png(2732,true);
for(const name of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png'])writeFileSync('ios/App/App/Assets.xcassets/Splash.imageset/'+name,splash);
for(const [density,size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]){
  const folder='android/app/src/main/res/mipmap-'+density;mkdirSync(folder,{recursive:true});
  for(const name of ['ic_launcher.png','ic_launcher_round.png'])writeFileSync(folder+'/'+name,png(size));
}
const vector='<?xml version="1.0" encoding="utf-8"?><vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#F6F8F0" android:pathData="M54,54 C20,52 28,18 46,34 C53,39 54,46 54,54 M54,54 C56,20 90,28 74,46 C69,53 62,54 54,54 M54,54 C88,56 80,90 62,74 C55,69 54,62 54,54 M54,54 C52,88 18,80 34,62 C39,55 46,54 54,54"/></vector>';
writeFileSync('android/app/src/main/res/drawable/clover_mark.xml',vector);
for(const name of ['ic_launcher.xml','ic_launcher_round.xml'])writeFileSync('android/app/src/main/res/mipmap-anydpi-v26/'+name,'<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/clover_mark"/></adaptive-icon>');
writeFileSync('android/app/src/main/res/values/ic_launcher_background.xml','<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#42664D</color></resources>');
writeFileSync('android/app/src/main/res/drawable/clover_splash.xml','<?xml version="1.0" encoding="utf-8"?><layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/clover_background"/></layer-list>');
writeFileSync('android/app/src/main/res/values/colors.xml','<?xml version="1.0" encoding="utf-8"?><resources><color name="colorPrimary">#42664D</color><color name="colorPrimaryDark">#304C38</color><color name="colorAccent">#42664D</color><color name="clover_background">#F6F8F0</color></resources>');
console.log('CLover Android/iOS icons and launch assets generated.');
