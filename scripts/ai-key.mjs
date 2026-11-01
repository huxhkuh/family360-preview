import {readFileSync} from 'node:fs';
import path from 'node:path';

// Local tools read the existing credential in memory. Never copy it into a bundle,
// fixture, command argument, log, or new env file.
export function existingAiKey(){
 if(process.env.OPENAI_API_KEY?.startsWith('sk-'))return process.env.OPENAI_API_KEY;
 const file=process.env.OPENAI_KEY_FILE||path.join(process.env.USERPROFILE||process.env.HOME||'','Downloads','API.txt');
 let text='';try{text=readFileSync(file,'utf8');}catch{throw Error('No existing API credential is available.');}
 const key=text.match(/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{25,}/)?.[0];
 if(!key)throw Error('No usable API credential was found.');return key;
}
