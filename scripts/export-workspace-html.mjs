import {build} from 'esbuild';
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.json':'application/json'};
const assets={};
function collect(dir){for(const entry of readdirSync(path.join(root,'public',dir),{withFileTypes:true})){const name=path.posix.join(dir,entry.name);if(entry.isDirectory())collect(name);else if(types[path.extname(name)])assets[name]=`data:${types[path.extname(name)]};base64,${readFileSync(path.join(root,'public',name)).toString('base64')}`;}}
for(const dir of ['brand','homepage','companion','data'])collect(dir);
const result=await build({absWorkingDir:root,entryPoints:['src/main.tsx'],bundle:true,write:false,outdir:'artifacts/standalone-build',format:'iife',minify:true,target:'es2022',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env':JSON.stringify({BASE_URL:'./',MODE:'production',PROD:true,DEV:false})},loader:{'.png':'dataurl','.svg':'dataurl','.webp':'dataurl','.woff2':'dataurl','.woff':'dataurl'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
const html=`<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מסודרים 360 — סביבות העבודה</title><style>${css}</style></head><body><div id="root"></div><script>window.__FAMILY360_ASSETS__=${JSON.stringify(assets)};if(location.protocol==='file:')document.documentElement.dataset.offlinePreview='true';if(!location.hash)location.hash='#workspace';</script><script>${js}</script></body></html>`;
const destinations=[path.join(root,'demo-static/demos/role-workspaces.html'),...process.argv.slice(2).map(p=>path.resolve(p))];
for(const dest of destinations){mkdirSync(path.dirname(dest),{recursive:true});writeFileSync(dest,html);console.log(`${dest} (${(Buffer.byteLength(html)/1048576).toFixed(1)} MB)`);}
