import {CHAPTERS,type Answers} from './questionnaire-definition';
import {conditionMatches} from '../lib/core';
import type {Service} from '../lib/model';
export function missingAnswers(answers:Answers,services:Service[]){
 const absent=(v:unknown)=>v===undefined||v===null||(typeof v==='string'&&!v.trim())||(Array.isArray(v)&&!v.length);
 const missing=CHAPTERS.filter(c=>!c.cond||c.cond(answers)).flatMap(c=>c.secs.filter(s=>!s.cond||s.cond(answers)).flatMap(s=>(s.fields||[]).filter(f=>f.req&&(!f.cond||f.cond(answers))&&absent(answers[f.k])).map(f=>({key:f.k,label:`${c.title} · ${s.t}: ${f.l}`,chapter:c.key}))));
 services.filter(s=>s.active&&s.trigger_conditions.every(r=>conditionMatches(answers,r))).forEach(s=>s.client_fields.filter(f=>f.required&&(!f.show_when||conditionMatches(answers,f.show_when))&&absent(answers[f.key])).forEach(f=>missing.push({key:f.key,label:`${s.name}: ${f.label}`,chapter:'custom'})));
 return missing;
}
