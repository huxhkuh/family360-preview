import {CHAPTERS,type Answers} from './questionnaire-definition';
import {missingAnswers,questionnaireIssues} from './questionnaire-validation';

export function hasQuestionnaireAnswers(value:unknown):boolean{
 if(value==null)return false;
 if(typeof value==='object')return Object.values(value).some(hasQuestionnaireAnswers);
 return String(value).trim().length>0;
}

export function chapterProgress(answers:Answers){
 const missing=missingAnswers(answers,[]);const issues=questionnaireIssues(answers,[]);const missingKeys=new Set(missing.map(m=>m.key));
 return CHAPTERS.filter(c=>!c.cond||c.cond(answers)).map(chapter=>{
  const required=chapter.secs.filter(s=>!s.cond||s.cond(answers)).flatMap(s=>s.fields||[]).filter(f=>f.req&&(!f.cond||f.cond(answers))).length;
  const remaining=missing.filter(m=>m.chapter===chapter.key).length;
  const invalid=issues.filter(i=>i.chapter===chapter.key&&!missingKeys.has(i.key)).length;
  return {chapter,required,remaining,invalid,filled:required-remaining};
 });
}
