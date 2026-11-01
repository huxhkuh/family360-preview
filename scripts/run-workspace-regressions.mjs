import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='artifacts/guided-regressions';mkdirSync(out,{recursive:true});
const selected=process.argv.slice(2);
const tests=selected.length?selected:['check-demo','check-journey','check-mint','check-mint-workflow','check-final-report','check-representative','check-task-surfaces','check-role-handoffs','check-focused-home','check-workspace-brand','check-studio-integration','check-client-workspace','check-client-folio','check-client-decisions','check-completed-example'];
let next=0;const results=[];
async function worker(){while(next<tests.length){const name=tests[next++];console.log('START',name);await new Promise(resolve=>{const p=spawn(process.execPath,[`scripts/${name}.mjs`],{env:{...process.env,DEMO_URL:process.env.DEMO_URL||'http://127.0.0.1:5286/family360-preview/'},stdio:['ignore','pipe','pipe']});let log='';p.stdout.on('data',d=>log+=d);p.stderr.on('data',d=>log+=d);p.on('exit',code=>{writeFileSync(`${out}/${name}.log`,log);results.push({name,code});console.log(code===0?'PASS':'FAIL',name);resolve();});});}}
await Promise.all([worker(),worker()]);writeFileSync(out+'/results.json',JSON.stringify(results,null,2));if(results.some(r=>r.code!==0))process.exitCode=1;
