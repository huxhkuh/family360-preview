import {z} from 'zod';
import {CHAPTERS,type LegacyField} from '../families/questionnaire-definition';
import {conditionMatches} from '../lib/core';
export const reviewLabels={not_reviewed:'לא תועד בירור',conversation:'בירור בשיחת הנציג',professional:'תועדה בדיקה מקצועית',partial:'נבדק חלקית — ראו פירוט',not_relevant:'הנציג סימן שאינו רלוונטי',follow_up:'נדרש המשך בירור'};
export const chapterReviewSchema=z.object({key:z.string().min(1).max(100),status:z.enum(['not_reviewed','conversation','professional','partial','not_relevant','follow_up']),note:z.string().trim().max(2000)});
export type ChapterReview=z.infer<typeof chapterReviewSchema>;
export const coverageSchema=z.object({key:z.string(),title:z.string(),shown:z.boolean(),items:z.array(z.object({key:z.string(),label:z.string(),value:z.string(),source:z.string()})),review:chapterReviewSchema});
export type QuestionnaireCoverage=z.infer<typeof coverageSchema>;
type Values=Record<string,unknown>;
type CustomService={id:string;name:string;active:boolean;trigger_conditions:Parameters<typeof conditionMatches>[1][];client_fields:{key:string;label:string;type:string;options?:string[];show_when?:Parameters<typeof conditionMatches>[1]|null}[]};
function answered(value:unknown){return value!=null&&value!==''&&(!Array.isArray(value)||value.length>0);}
function format(field:LegacyField,value:unknown){
 if(!answered(value))return field.followUp||'לא נמסר';
 if(field.type==='id')return 'מסתיים ב־'+String(value).slice(-4);
 const one=(v:unknown)=>{if(typeof v==='object')return 'נדרש בירור לגבי מבנה הנתון';const option=field.opts?.find(([key])=>key===String(v));if(option)return option[1];if(field.opts)return 'ערך קודם שנדרש לברר';if(field.type==='currency'&&Number.isFinite(Number(v)))return new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:2}).format(Number(v));return String(v);};
 return Array.isArray(value)?value.map(one).join(' · '):one(value);
}
export function buildQuestionnaireCoverage(answers:Values={},reviews:ChapterReview[]=[],services:CustomService[]=[]):QuestionnaireCoverage[]{
 const rows:QuestionnaireCoverage[]=[];
 function fields(defs:LegacyField[],values:Values,prefix='',keyPrefix=''):QuestionnaireCoverage['items']{
  return defs.filter(f=>!f.cond||f.cond(values)).flatMap(f=>{
   const value=values[f.k],label=prefix+(f.l||({savings:'סוגי חסכונות',ins:'סוגי ביטוחים'} as Record<string,string>)[f.k]||f.k),key=keyPrefix+f.k;
   if(f.type==='repeat'){
    if(value!=null&&!Array.isArray(value))return [{key,label,value:'נתון במבנה לא תקין — נדרש בירור',source:'תשובות הלקוח בשאלון'}];
    if(!Array.isArray(value)||!value.length)return [{key,label,value:'לא נמסרו פריטים; אין להסיק מכך שאין כאלה',source:'תשובות הלקוח בשאלון'}];
    return value.flatMap((child,index)=>child&&typeof child==='object'&&!Array.isArray(child)?fields(f.sub||[],child as Values,`${label} ${index+1} · `,`${key}.${index}.`):[{key:`${key}.${index}`,label,value:'נתון במבנה לא תקין — נדרש בירור',source:'תשובות הלקוח בשאלון'}]);
   }
   return [{key,label,value:format(f,value),source:'תשובות הלקוח בשאלון — מידע שנמסר, לא אישור בדיקה מקצועית'}];
  });
 }
 for(const chapter of CHAPTERS){
  const shown=!chapter.cond||chapter.cond(answers),items=shown?chapter.secs.filter(s=>!s.cond||s.cond(answers)).flatMap(s=>{
   if(s.dyn==='perChild')return (Array.isArray(answers.children)?answers.children:[]).flatMap((child,index)=>fields([{k:`wt_${index}`,l:`ילד ${index+1} · יעד לחתונה`,type:'currency'},{k:`wa_${index}`,l:`ילד ${index+1} · גיל יעד`}],answers));
   return fields(s.fields||[],answers,s.t+' · ');
  }):[];
  rows.push({key:chapter.key,title:chapter.title,shown,items,review:reviews.find(r=>r.key===chapter.key)||{key:chapter.key,status:'not_reviewed',note:''}});
 }
 for(const service of services.filter(s=>s.active&&s.client_fields.length&&s.trigger_conditions.every(r=>conditionMatches(answers,r)))){
  const key='service:'+service.id;rows.push({key,title:service.name,shown:true,items:fields(service.client_fields.filter(f=>!f.show_when||conditionMatches(answers,f.show_when)).map(f=>({k:f.key,l:f.label,type:f.type,opts:f.options?.map(option=>[option,option])})),answers),review:reviews.find(r=>r.key===key)||{key,status:'not_reviewed',note:''}});
 }
 return rows;
}
