import type {Answers} from './questionnaire-definition';
import type {Family} from '../lib/model';
import {validPhoneNumber} from './questionnaire-validation';

export function toggleAnswer(values:unknown,value:string,checked:boolean,exclusive:string[]=[]):string[]{
 const old=Array.isArray(values)?values:[];
 if(!checked)return old.filter(v=>v!==value);
 return exclusive.includes(value)?[value]:[...new Set([...old.filter(v=>!exclusive.includes(v)),value])];
}
export const validPhone=(value:unknown)=>typeof value==='string'&&validPhoneNumber(value.trim());
export function initialAnswers(family:Pick<Family,'answers'|'phone'|'email'>):Answers{
 return {h_phone:family.phone||'',h_email:family.email||'',...family.answers};
}
// Only a valid main contact number replaces the case phone. Incomplete drafts remain editable.
export function contactPatch(family:Pick<Family,'answers'|'phone'|'email'>,patch:Record<string,unknown>){
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
 if(Object.hasOwn(patch,'email')){
  if(patch.email!==''&&(typeof patch.email!=='string'||!validContactEmail(patch.email)))throw Error('VALIDATION');
  const answers=(result.answers||family.answers||{}) as Answers;
  if(patch.answers&&answers.h_email!==undefined&&answers.h_email!==patch.email)throw Error('VALIDATION');
  result.answers={...answers,h_email:patch.email};
 }else if(patch.answers){
  const answers=patch.answers as Answers;if(validContactEmail(answers.h_email))result.email=String(answers.h_email).trim();
 }
 return result;
}
const validContactEmail=(value:unknown):value is string=>typeof value==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export function validApproxDate(value:string,today:string){
 const normalized=/^\d{4}$/.test(value)?value+'-01-01':/^\d{4}-\d{2}$/.test(value)?value+'-01':value;
 const date=new Date(normalized+'T00:00:00Z');
 return /^\d{4}-\d{2}-\d{2}$/.test(normalized)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===normalized&&normalized<=today;
}
