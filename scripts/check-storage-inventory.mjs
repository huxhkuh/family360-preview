import {readFile} from 'node:fs/promises';
import {reconcileStorage} from './storage-reconciliation.ts';
const path=process.argv[2];
if(!path)throw Error('Usage: node scripts/check-storage-inventory.mjs LOCAL_INVENTORY.json');
const input=JSON.parse(await readFile(path,'utf8'));
if(!input||!['documents','versions','objects'].every(key=>Array.isArray(input[key])))throw Error('INVALID_INVENTORY');
const report=reconcileStorage(input);
console.log(JSON.stringify(report,null,2));
if(Object.values(report).some(items=>items.length))process.exitCode=1;
