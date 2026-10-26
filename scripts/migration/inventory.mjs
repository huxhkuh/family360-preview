import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url);
async function walk(url){const out=[];for(const e of await readdir(url,{withFileTypes:true})){const child=new URL(e.name+(e.isDirectory()?'/':''),url);if(e.isDirectory())out.push(...await walk(child));else out.push(child);}return out;}
const files=await walk(new URL('src/',root));const calls=new Map();
for(const file of files){if(!/\.(ts|tsx)$/.test(file.pathname)||/\.test\./.test(file.pathname))continue;const text=await readFile(file,'utf8');for(const m of text.matchAll(/\brpc_[a-z0-9_]+\b/g)){const name=m[0];const locations=calls.get(name)||new Set();locations.add(decodeURIComponent(file.pathname).split('/src/')[1]);calls.set(name,locations);}}
const migrations=[];const functions=new Set();
for(const file of await walk(new URL('legacy/postgres/',root))){const text=await readFile(file,'utf8');migrations.push({file:file.pathname.split('/').at(-1),sha256:createHash('sha256').update(text).digest('hex')});for(const m of text.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(rpc_\w+)/gi))functions.add(m[1]);}
const inventory={generated:new Date().toISOString(),uiRepository:'huxhkuh/family360-preview',legacyRepository:'huxhkuh/family360',migrations,operations:[...new Set([...calls.keys(),...functions])].sort().map(name=>({name,inPostgres:functions.has(name),uiFiles:[...(calls.get(name)||[])],status:'pending-port-and-verification'}))};
await writeFile(new URL('docs/migration/operation-inventory.json',root),JSON.stringify(inventory,null,2)+'\n');
console.log(JSON.stringify({migrations:migrations.length,operations:inventory.operations.length,uiOperations:calls.size,postgresOperations:functions.size}));
