import {CHAPTERS,type Answers,type LegacyField} from './questionnaire-definition';
export type DiscussionTopic={key:string;label:string;chapter:string;value:string;token:string};
export function questionnaireDiscussion(answers:Answers):DiscussionTopic[]{
 const topics:DiscussionTopic[]=[];
 function visit(field:LegacyField,values:Answers,chapter:string,path='',context=''){
  if(field.cond&&!field.cond(values))return;
  const value=values[field.k],key=path+field.k;
  if(field.type==='repeat'){
   if(Array.isArray(value))value.forEach((row,index)=>{if(row&&typeof row==='object')field.sub?.forEach(sub=>visit(sub,row,chapter,`${key}.${index}.`,`${field.l} ${index+1} · `));});
   return;
  }
  const selected=Array.isArray(value)?value:[value];
  const empty=value==null||value==='';
  const review=selected.some(v=>['dk','none','no','partial','private'].includes(v))||field.k==='savings_goals'&&selected.some(Boolean)||field.k==='ravkav_review'&&value==='yes';
  if(!(review||empty&&field.followUp))return;
  topics.push({key,chapter,label:context+(field.l||({savings:'חסכונות',ins:'ביטוחים'}[field.k])||field.k),value:empty?field.followUp!:selected.map(v=>field.opts?.find(([k])=>k===v)?.[1]||String(v)).join(' · '),token:JSON.stringify({value:value??null,context:path?values:null})});
 }
 for(const chapter of CHAPTERS){
  if(chapter.cond&&!chapter.cond(answers))continue;
  chapter.secs.filter(s=>!s.cond||s.cond(answers)).forEach(section=>section.fields?.forEach(field=>visit(field,answers,chapter.title,'',section.t+' · ')));
 }
 return topics;
}
