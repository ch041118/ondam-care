import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const plist = require('plist');
const xml = require('xml2js');
const xcode = require('xcode');
const info = plist.parse(readFileSync('ios/App/App/Info.plist', 'utf8'));
assert.ok(info.NSMicrophoneUsageDescription);
const privacy = plist.parse(readFileSync('ios/App/App/PrivacyInfo.xcprivacy', 'utf8'));
assert.ok(privacy.NSPrivacyAccessedAPITypes.length >= 2);
const project = xcode.project('ios/App/App.xcodeproj/project.pbxproj');
project.parseSync();
assert.ok(project.generateUuid().length === 24);
assert.ok(Object.values(project.pbxResourcesBuildPhaseObj(project.getFirstTarget().uuid).files).some(f => f.comment === 'PrivacyInfo.xcprivacy in Resources'));
const manifest = await xml.parseStringPromise(readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8'));
assert.ok(manifest.manifest['uses-permission'].some(p => p.$['android:name'] === 'android.permission.RECORD_AUDIO'));
for (const folder of readdirSync('android/app/src/main/res', {withFileTypes:true}).filter(d=>d.isDirectory())) {
  const names = new Set();
  for (const file of readdirSync(join('android/app/src/main/res',folder.name))) {
    if (folder.name.startsWith('values')) continue;
    const stem=basename(file,extname(file));
    assert.ok(!names.has(stem),`Duplicate Android resource: ${folder.name}/${stem}`);names.add(stem);
  }
}
for (const destination of ['android/app/src/main/assets/public','ios/App/App/public']) {
  assert.ok(existsSync(destination+'/app.js'));
  assert.equal(readFileSync(destination+'/app.js','utf8'),readFileSync('dist/app.js','utf8'));
  assert.equal(readFileSync(destination+'/style.css','utf8'),readFileSync('dist/style.css','utf8'));
}
console.log('Native project metadata, microphone permissions, privacy resource, Android resources, and synchronized bundles verified.');
console.log('This check does not compile Java/Swift or validate a real device.');
