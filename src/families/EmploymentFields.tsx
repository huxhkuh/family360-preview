import {type ReactNode,useEffect,useRef} from 'react';
import type {Answers,LegacyField} from './questionnaire-definition';

// These supplementary fields remain part of validation, saving and review.
// Keep occupation, income and continuity questions in the main flow.
const supplementary=new Set(['h_work','h_tenure','h_employers','h_job_change','h_biz_years','h_biz_registration','w_work','w_job_change','w_biz_registration']);
export function EmploymentFields({fields,answers,errors,renderField}:{fields:LegacyField[];answers:Answers;errors:Record<string,string>;renderField:(field:LegacyField)=>ReactNode}){
 const visible=fields.filter(f=>!f.cond||f.cond(answers));
 const extra=visible.filter(f=>supplementary.has(f.k)&&!f.req);
 const main=visible.filter(f=>!extra.includes(f));
 const details=useRef<HTMLDetailsElement>(null);
 const hasError=extra.some(f=>errors[f.k]);
 const filled=extra.filter(f=>answers[f.k]!=null&&String(answers[f.k]).trim()!=='').length;
 useEffect(()=>{if(hasError&&details.current)details.current.open=true;},[hasError]);
 return <><div className="fields">{main.map(renderField)}</div>{extra.length>0&&<details ref={details} className="employment-details"><summary>פרטים נוספים על העבודה · רשות{filled>0&&<small>מולאו {filled} מתוך {extra.length}</small>}</summary><p>מקום העבודה ופרטים נוספים לבירור עם הנציג. אפשר למלא עכשיו או להשלים בהמשך.</p><div className="fields">{extra.map(renderField)}</div></details>}</>;
}
