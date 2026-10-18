import {ResourceLibrary} from '../resources/ResourceLibrary';
import {ContactReuse} from './ContactReuse';
import {PreparationTip} from './PreparationTip';
import {useEffect,useState} from 'react';
import {CHAPTERS,type Answers,type LegacyField} from './questionnaire-definition';
import type {Family,Service,Field as DynamicField} from '../lib/model';
import {AsyncButton,Field,SaveForm,Panel} from '../ui';
import {conditionMatches} from '../lib/core';
import {rpc} from '../lib/backend';
import {Icon} from '../icons';
import {employmentValues,toggleEmployment} from '../lib/employment';
import {QuestionHelp} from './QuestionHelp';
import './questionnaire-help.css';
import {missingAnswers} from './questionnaire-validation';
export function AnswerField({field,answers,onChange,advancedEmployment=false}:{field:LegacyField;answers:Answers;onChange:(key:string,value:unknown)=>void;advancedEmployment?:boolean;resourceLibraryEnabled?:boolean}){
 const value=answers[field.k];
 const title=field.l||({savings:'חסכונות והשקעות',ins:'סוגי הביטוח'}[field.k])||field.k;
 const help=<QuestionHelp fieldKey={field.k} label={title}/>;
 if(field.cond&&!field.cond(answers))return null;
 if(field.type==='employment'&&advancedEmployment)return <fieldset className="checks employment-options" data-answer-key={field.k} tabIndex={-1}><legend>{title}{field.req?' *':''}</legend><div className="question-heading"><span>אפשר לסמן כמה עיסוקים במקביל</span>{help}</div>{field.opts?.map(([v,label])=><label key={v}><input type="checkbox" checked={employmentValues(value).includes(v)} onChange={e=>onChange(field.k,toggleEmployment(value,v,e.target.checked))}/>{label}</label>)}</fieldset>;
 if(field.type==='repeat'){
 const rows=Array.isArray(value)?value:[];
 return <section className="repeat"><div className="question-heading"><h4>{title}</h4>{help}</div>{rows.map((row,index)=><div className="repeat-row" key={index}>{field.sub?.map(sub=><AnswerField key={sub.k} field={sub} answers={row} onChange={(k,v)=>onChange(field.k,rows.map((r,i)=>i===index?{...r,[k]:v}:r))}/>)}<button type="button" className="ghost" onClick={()=>onChange(field.k,rows.filter((_,i)=>i!==index))}>הסרה</button></div>)}<button type="button" onClick={()=>onChange(field.k,[...rows,{}])}>{field.addLabel||'הוספה'}</button></section>;
 }
 if(field.type==='checks')return <fieldset className="checks" data-answer-key={field.k} tabIndex={-1}><legend>{title}</legend><div className="question-heading question-group-help"><span>אפשר לבחור כמה אפשרויות</span>{help}</div>{field.opts?.map(([v,label])=><div className="check-option" key={v}><label><input type="checkbox" checked={Array.isArray(value)&&value.includes(v)} onChange={e=>onChange(field.k,e.target.checked?[...(value||[]),v]:(value||[]).filter((x:string)=>x!==v))}/>{label}</label><QuestionHelp fieldKey={field.k} option={v} label={label}/></div>)}</fieldset>;
 return <Field label={`${title}${field.req?' *':''}`} help={help}>{field.opts?<select data-answer-key={field.k} aria-required={!!field.req} value={value??''} onChange={e=>onChange(field.k,e.target.value)}><option value="">בחרו…</option>{field.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:<input data-answer-key={field.k} aria-required={!!field.req} value={value??''} onChange={e=>onChange(field.k,e.target.value)} maxLength={500} min={0} type={['currency','number'].includes(field.type||'')?'number':['date','email','tel'].includes(field.type||'')?field.type:'text'}/>}</Field>;
}
function dynamic(field:DynamicField):LegacyField{return {k:field.key,l:field.label,type:field.type,req:field.required?1:0,opts:field.options?.map(x=>[x,x])};}
export function Questionnaire({family,services,refresh,onDirtyChange,onComplete,advancedEmployment=false,resourceLibraryEnabled=false}:{family:Family;services:Service[];refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void;onComplete:()=>void;advancedEmployment?:boolean;resourceLibraryEnabled?:boolean}){
 const [answers,setAnswers]=useState<Answers>(family.answers||{});
 const [saved,setSaved]=useState(JSON.stringify(family.answers||{}));
 const [revision,setRevision]=useState(family.updated_at);
 const [chapter,setChapter]=useState('family');const [showMissing,setShowMissing]=useState(false);
 const [busy,setBusy]=useState(false);
 const dirty=JSON.stringify(answers)!==saved;
 function loadLatest(){setAnswers(family.answers||{});setSaved(JSON.stringify(family.answers||{}));setRevision(family.updated_at);}
 // A refresh must not advance the optimistic-lock revision under a local draft.
 useEffect(()=>{if(!dirty)loadLatest();},[family.updated_at]);
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const visible=CHAPTERS.filter(c=>!c.cond||c.cond(answers));
 const current=visible.find(c=>c.key===chapter)||visible[0];const index=visible.indexOf(current);
 const set=(k:string,v:unknown)=>setAnswers(prev=>({...prev,[k]:v}));
 const custom=services.filter(s=>s.active&&s.trigger_conditions.every(r=>conditionMatches(answers,r)));
 const missing=missingAnswers(answers,services);
 const persistDraft=async()=>{const result=await rpc<Family>('rpc_save_family',{p_family_id:family.id,p_patch:{answers},p_expected_updated_at:revision});setSaved(JSON.stringify(answers));setRevision(result.updated_at);await refresh();};
 const saveDraft=async()=>{setBusy(true);try{await persistDraft();}finally{setBusy(false);}};
 const submitted=family.onboarding_pct===100;
 function jump(key:string,chapterKey:string){setChapter(chapterKey==='custom'?current.key:chapterKey);requestAnimationFrame(()=>{const field=Array.from(document.querySelectorAll<HTMLElement>('[data-answer-key]')).find(el=>el.dataset.answerKey===key);if(field){const details=field.closest('details');if(details)details.open=true;field.focus();field.scrollIntoView({block:'center',behavior:'auto'});}});}
 return <Panel title="השאלון המשפחתי"><fieldset disabled={busy} aria-busy={busy}>
 <p className="section-intro">ממלאים את מה שידוע לכם, שומרים טיוטה וממשיכים בקצב שלכם. לחצו על סימן השאלה לצד השדות להסבר ולדוגמה. שדות המסומנים בכוכבית (*) נדרשים לשליחה לבדיקה. המידע נשמר רק בלחיצה על שמירה.</p>
 {family.updated_at!==revision&&<p className="hint" role="status">התיק עודכן בזמן העריכה. הטיוטה שלכם נשארה במסך כדי שלא תאבד. <button className="text-button" onClick={()=>{if(!dirty||window.confirm('לטעון את התשובות המעודכנות ולוותר על השינויים שלא נשמרו?'))loadLatest();}}>טעינת התשובות המעודכנות</button></p>}
 <div className="questionnaire-status"><span><Icon name="tasks"/> פרק {index+1} מתוך {visible.length}</span><span role="status">{dirty?'יש שינויים שטרם נשמרו':submitted?'השאלון כבר נשלח לבדיקה':'הטיוטה תישמר בתיק המשפחה'}</span></div>
 <nav className="tabs chapter-tabs" aria-label="פרקי השאלון">{visible.map(c=><button key={c.key} aria-current={c.key===current.key?'step':undefined} className={c.key===current.key?'selected':'ghost'} onClick={()=>setChapter(c.key)}><Icon name={c.key}/>{c.title}</button>)}</nav>
 <SaveForm protectDraft={false} noValidate label="שמירת טיוטה" successMessage="הטיוטה נשמרה. אפשר להמשיך לפרק הבא או לחזור אליה בהמשך." save={saveDraft}>
 <PreparationTip chapter={current.key}/>
 {current.key==='family'&&<ContactReuse family={family} answers={answers} apply={patch=>setAnswers(a=>({...a,...patch}))}/>}
 <div className="chapter-heading"><span className="chapter-number">{String(index+1).padStart(2,'0')}</span><div><h3>{current.title}</h3><p>{current.desc}</p></div></div>{current.secs.filter(s=>!s.cond||s.cond(answers)).map((s,i)=>{const content=<section className="question-section" key={i}><h4>{s.t}</h4>{s.hint&&<p className="hint">{s.hint}</p>}<div className="fields">{s.fields?.map(f=><AnswerField key={f.k} field={f} answers={answers} onChange={set} advancedEmployment={advancedEmployment}/>)}</div>{s.dyn==='perChild'&&(answers.children||[]).map((child:{name?:string},index:number)=><section key={index}><h4>{child.name||`ילד ${index+1}`}</h4><div className="fields"><AnswerField field={{k:`wt_${index}`,l:'סכום שרוצים להכין לחתונה (₪)',type:'currency'}} answers={answers} onChange={set}/><AnswerField field={{k:`wa_${index}`,l:'באיזה גיל של הילד הכסף צפוי להידרש?',type:'number'}} answers={answers} onChange={set}/></div></section>)}</section>;return s.optional?<details className="optional-questions" key={i}><summary>{s.t}</summary>{content}</details>:content;})}
 {custom.some(s=>s.client_fields.length>0)&&<details><summary>שאלות נוספות לפי תחום</summary>{custom.map(s=><section key={s.id}><h4>{s.name}</h4>{s.client_fields.filter(f=>!f.show_when||conditionMatches(answers,f.show_when)).map(f=><AnswerField key={f.key} field={dynamic(f)} answers={answers} onChange={set}/>)}</section>)}</details>}
 </SaveForm>
 <div className="chapter-actions"><button disabled={index===0} onClick={()=>setChapter(visible[index-1].key)}>לפרק הקודם</button>{index<visible.length-1?<AsyncButton action={async()=>{await saveDraft();setChapter(visible[index+1].key);}}>שמירה והמשך<Icon name="arrow"/></AsyncButton>:<span className="muted">זה הפרק האחרון. בדקו שהכול נשמר לפני השליחה.</span>}</div>
 {!submitted&&<section className="questionnaire-submit"><h3>סיימתם למלא?</h3><p>השליחה מעבירה את השאלון להמשך התהליך ומציגה מסמכים שנדרשים לפי התחומים. שמירת טיוטה בלבד אינה שולחת אותו.</p>
 <button onClick={()=>setShowMissing(true)}>בדיקת שדות חסרים</button>
 {showMissing&&<div className="validation-summary" role="status">{missing.length?<><strong>נותרו {missing.length} שדות חובה. לחצו כדי לעבור לשדה:</strong><ul>{missing.map(m=><li key={m.key+m.chapter}><button className="text-button" onClick={()=>jump(m.key,m.chapter)}>{m.label}</button></li>)}</ul></>:<p>כל שדות החובה בשאלון מולאו. אפשר לשלוח לבדיקה.</p>}</div>}
 <SaveForm protectDraft={false} label="סיום ושליחת השאלון לבדיקה" successMessage="השאלון נשלח." save={async()=>{setShowMissing(true);if(missing.length)throw new Error('VALIDATION');setBusy(true);try{await persistDraft();await rpc('rpc_complete_onboarding',{p_family_id:family.id});await refresh();onDirtyChange(false);onComplete();}finally{setBusy(false);}}}><p className="muted">לפני השליחה ודאו שגם איש הקשר והטלפון מעודכנים בלשונית הסקירה.</p></SaveForm></section>}
 </fieldset>{resourceLibraryEnabled&&<ResourceLibrary chapter={current.key} version={family.updated_at}/>}</Panel>;
}
