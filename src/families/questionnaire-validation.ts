import {validApproxDate} from './questionnaire-decisions';
import {CHAPTERS,type Answers,type LegacyField} from './questionnaire-definition';
import {conditionMatches} from '../lib/core';
import type {Service} from '../lib/model';
export function missingAnswers(answers:Answers,services:Service[]){
 const absent=(v:unknown)=>v===undefined||v===null||(typeof v==='string'&&!v.trim())||(Array.isArray(v)&&!v.length);
 const missing=CHAPTERS.filter(c=>!c.cond||c.cond(answers)).flatMap(c=>c.secs.filter(s=>!s.cond||s.cond(answers)).flatMap(s=>(s.fields||[]).filter(f=>f.req&&(!f.cond||f.cond(answers))&&absent(answers[f.k])).map(f=>({key:f.k,label:`${c.title} · ${s.t}: ${f.l}`,chapter:c.key}))));
 services.filter(s=>s.active&&s.trigger_conditions.every(r=>conditionMatches(answers,r))).forEach(s=>s.client_fields.filter(f=>f.required&&(!f.show_when||conditionMatches(answers,f.show_when))&&absent(answers[f.key])).forEach(f=>missing.push({key:f.key,label:`${s.name}: ${f.label}`,chapter:'custom'})));
 return missing;
}

export type AnswerIssue={key:string;label:string;chapter:string;message:string};
const absent=(v:unknown)=>v==null||typeof v==='string'&&!v.trim()||Array.isArray(v)&&!v.length;
export function questionnaireIssues(answers:Answers,services:Service[],today=new Date().toISOString().slice(0,10)):AnswerIssue[]{
 const issues:AnswerIssue[]=[];
 function check(field:LegacyField,values:Answers,chapter:string,prefix='',labelPrefix=''){
  if(field.cond&&!field.cond(values))return;
  const value=values[field.k],key=prefix+field.k,label=labelPrefix+(field.l||field.k);
  const add=(message:string)=>issues.push({key,label,chapter,message});
  if(absent(value)){if(field.req)add('יש להשלים את השדה.');return;}
  if(field.type==='repeat'){
   if(!Array.isArray(value)){add('יש לבדוק את הרשימה.');return;}
   value.forEach((row,index)=>{if(!row||typeof row!=='object'||Array.isArray(row)){add('יש לבדוק את הרשימה.');return;}field.sub?.forEach(sub=>check(sub,row,chapter,`${key}.${index}.`,`${label} ${index+1} · `));});return;
  }
  const text=String(value).trim();
  if(field.type==='approx-date'&&!validApproxDate(text,today))add('אפשר להזין שנה (2018), חודש ושנה (2018-06) או תאריך מלא בעבר.');
  if(field.opts){const selected=Array.isArray(value)?value:[value];if(selected.length>1&&selected.some(v=>field.exclusive?.includes(v)))add('אין לשלב ״אין״ או ״לא יודעים״ עם תשובות אחרות.');if(selected.some(v=>!field.opts!.some(([key])=>key===v)))add('יש לבחור אפשרות מהרשימה.');return;}
  if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))add('יש להזין כתובת דוא״ל תקינה, למשל name@example.com.');
  if(field.type==='id'&&!validIdentityNumber(text))add('יש להזין מספר תעודת זהות תקין בן 9 ספרות, כולל ספרת הביקורת.');
  if(field.type==='tel'&&!validPhoneNumber(text))add('יש להזין מספר טלפון תקין, כולל קידומת, למשל 0500000000.');
  if(['number','currency'].includes(field.type||'')&&(!Number.isFinite(Number(value))||Number(value)<0))add('יש להזין מספר שאינו שלילי.');
  if(field.type==='date'){
   const date=new Date(text+'T00:00:00Z');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==text)add('יש להזין תאריך תקין.');
   else if(/(^|_)dob$/.test(field.k)&&text>today)add('תאריך הלידה לא יכול להיות בעתיד.');
  }
 }
 CHAPTERS.filter(c=>!c.cond||c.cond(answers)).forEach(c=>c.secs.filter(s=>!s.cond||s.cond(answers)).forEach(s=>{
  s.fields?.forEach(f=>check(f,answers,c.key));
  if(s.dyn==='perChild'&&Array.isArray(answers.children))answers.children.forEach((_:unknown,i:number)=>{check({k:`wt_${i}`,l:`יעד חתונה לילד ${i+1}`,type:'currency'},answers,c.key);check({k:`wa_${i}`,l:`גיל יעד לילד ${i+1}`,type:'number'},answers,c.key);});
 }));
 services.filter(s=>s.active&&s.trigger_conditions.every(r=>conditionMatches(answers,r))).forEach(s=>s.client_fields.filter(f=>!f.show_when||conditionMatches(answers,f.show_when)).forEach(f=>check({k:f.key,l:s.name+' · '+f.label,type:f.type,req:f.required?1:0,opts:f.options?.map(x=>[x,x])},answers,'custom')));
 return issues;
}

export function validIdentityNumber(value:string){
 if(!/^\d{9}$/.test(value)||/^0+$/.test(value))return false;
 return [...value].reduce((sum,digit,index)=>{const n=Number(digit)*(index%2+1);return sum+(n>9?n-9:n);},0)%10===0;
}
export function validPhoneNumber(value:string){
 const phone=value.replace(/[\s()-]/g,'');
 return /^0(?:[23489]\d{7}|[57]\d{8})$/.test(phone)||/^\+[1-9]\d{6,14}$/.test(phone);
}
