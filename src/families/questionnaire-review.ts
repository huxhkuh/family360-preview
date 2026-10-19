import {CHAPTERS,type Answers,type LegacyField} from './questionnaire-definition';
import {conditionMatches} from '../lib/core';
import type {Service} from '../lib/model';
export function questionnaireReview(answers:Answers,services:Service[]){
 function fields(definitions:LegacyField[],values:Answers,prefix=''):Array<{label:string;value:string}>{
  return definitions.filter(f=>!f.cond||f.cond(values)).flatMap(f=>{
   const value=values[f.k];if(value==null||value===''||Array.isArray(value)&&!value.length)return [];
   if(f.type==='repeat')return Array.isArray(value)?value.flatMap((row,i)=>fields(f.sub||[],row,`${f.l||f.k} ${i+1} · `)):[];
   const text=(v:unknown)=>f.opts?.find(([key])=>key===v)?.[1]||String(v);
   return [{label:prefix+(f.l||({savings:'חסכונות',ins:'ביטוחים'} as Record<string,string>)[f.k]||f.k),value:Array.isArray(value)?value.map(text).join(', '):text(value)}];
  });
 }
 const rows=CHAPTERS.filter(c=>!c.cond||c.cond(answers)).map(c=>({key:c.key,title:c.title,items:c.secs.filter(s=>!s.cond||s.cond(answers)).flatMap(s=>s.dyn==='perChild'?(answers.children||[]).flatMap((child:{name?:string},i:number)=>fields([{k:`wt_${i}`,l:`${child.name||`ילד ${i+1}`} · יעד לחתונה`},{k:`wa_${i}`,l:`${child.name||`ילד ${i+1}`} · גיל יעד`}],answers)):fields(s.fields||[],answers))}));
 for(const service of services.filter(s=>s.active&&s.trigger_conditions.every(r=>conditionMatches(answers,r)))){
  const items=fields(service.client_fields.filter(f=>!f.show_when||conditionMatches(answers,f.show_when)).map(f=>({k:f.key,l:f.label,type:f.type,opts:f.options?.map(x=>[x,x])})),answers);
  if(items.length)rows.push({key:'custom',title:service.name,items});
 }
 return rows;
}
