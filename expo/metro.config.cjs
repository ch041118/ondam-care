const { getDefaultConfig } = require('expo/metro-config');
const {resolve} = require('node:path');
const config=getDefaultConfig(__dirname);
config.watchFolders=[...(config.watchFolders||[]),resolve(__dirname,'../public')];
module.exports=config;
