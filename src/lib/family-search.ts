import type {Family} from './model';

// Treat complete Israeli international numbers as their local equivalent.
// Partial searches remain partial; never turn punctuation alone into a match.
export function phoneSearchKey(value:string){
 const digits=value.replace(/\D/g,'');
 return /^(?:00)?972[1-9]\d{7,8}$/.test(digits)?'0'+digits.replace(/^(?:00)?972/,''):digits;
}
export function familyMatches(family:Family,query:string){
 const q=query.trim().toLocaleLowerCase();
 if(!q)return true;
 if([family.name,family.case_number,family.contact_name,family.email].some(v=>v?.toLocaleLowerCase().includes(q)))return true;
 if(!/^[+\d\s().-]+$/.test(q))return false;
 const phone=phoneSearchKey(q);
 return !!phone&&phoneSearchKey(family.phone||'').includes(phone);
}
