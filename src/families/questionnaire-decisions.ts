import type {Answers} from './questionnaire-definition';
import type {Family} from '../lib/model';

export function toggleAnswer(values:unknown,value:string,checked:boolean,exclusive:string[]=[]):string[]{
 const old=Array.isArray(values)?values:[];
 if(!checked)return old.filter(v=>v!==value);
 return exclusive.includes(value)?[value]:[...new Set([...old.filter(v=>!exclusive.includes(v)),value])];
}
export const validPhone=(value:unknown)=>typeof value==='string'&&/^\+?\d{7,15}$/.test(value.trim().replace(/[\s()-]/g,''));
export function initialAnswers(family:Pick<Family,'answers'|'phone'>):Answers{
 return {h_phone:family.phone||'',...family.answers};
}
// Only a valid main contact number replaces the case phone. Incomplete drafts remain editable.
export function contactPatch(family:Pick<Family,'answers'|'phone'>,patch:Record<string,unknown>){
 const result={...patch};
 if(Object.hasOwn(patch,'phone')){
  if(!validPhone(patch.phone))throw Error('VALIDATION');
  const answers=(patch.answers||family.answers||{}) as Answers;
  if(patch.answers&&answers.h_phone!==undefined&&answers.h_phone!==patch.phone)throw Error('VALIDATION');
  result.answers={...answers,h_phone:patch.phone};
 }else if(patch.answers){
  const answers=patch.answers as Answers;
  if(validPhone(answers.h_phone))result.phone=answers.h_phone;
 }
 return result;
}
export function validApproxDate(value:string,today:string){
 const normalized=/^\d{4}$/.test(value)?value+'-01-01':/^\d{4}-\d{2}$/.test(value)?value+'-01':value;
 const date=new Date(normalized+'T00:00:00Z');
 return /^\d{4}-\d{2}-\d{2}$/.test(normalized)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===normalized&&normalized<=today;
}
