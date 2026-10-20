import {BrandLogo} from '../branding/Brand';
import {questionnaireReview} from './questionnaire-review';
import {ChapterProgress} from './ChapterProgress';
import {chapterProgress} from './chapter-progress';
import {useRetainedState} from '../lib/draft-guard';
import {ResourceLibrary} from '../resources/ResourceLibrary';
import {ContactReuse} from './ContactReuse';
import {PreparationTip} from './PreparationTip';
import {createContext,useContext,useId,useEffect,useRef,useState} from 'react';
import {type Answers,type LegacyField} from './questionnaire-definition';
import type {Family,Service,Field as DynamicField} from '../lib/model';
import {AsyncButton,Field,SaveForm,Panel} from '../ui';
import {conditionMatches} from '../lib/core';
import {rpc} from '../lib/backend';
import {Icon} from '../icons';
import {employmentValues,toggleEmployment} from '../lib/employment';
import {QuestionHelp} from './QuestionHelp';
import './questionnaire-help.css';
import {questionnaireIssues} from './questionnaire-validation';
const AnswerErrors=createContext<Record<string,string>>({});
export function AnswerField({field,answers,onChange,advancedEmployment=false,path=''}:{path?:string;field:LegacyField;answers:Answers;onChange:(key:string,value:unknown)=>void;advancedEmployment?:boolean;resourceLibraryEnabled?:boolean}){
 const value=answers[field.k];const key=path+field.k;const error=useContext(AnswerErrors)[key];const errorId=useId();
 const title=field.l||({savings:'חסכונות והשקעות',ins:'סוגי הביטוח'}[field.k])||field.k;
 const help=<QuestionHelp fieldKey={field.k} label={title}/>;
 if(field.cond&&!field.cond(answers))return null;
 if(field.type==='employment'&&advancedEmployment)return <fieldset className="checks employment-options" data-answer-key={key} tabIndex={-1} aria-invalid={!!error} aria-describedby={error?errorId:undefined}><legend>{title}{field.req?' *':''}</legend><div className="question-heading"><span>אפשר לסמן כמה עיסוקים במקביל</span>{help}</div>{field.opts?.map(([v,label])=><label key={v}><input type="checkbox" checked={employmentValues(value).includes(v)} onChange={e=>onChange(field.k,toggleEmployment(value,v,e.target.checked))}/>{label}</label>)}{error&&<p className="field-error" id={errorId}>{error}</p>}</fieldset>;
 if(field.type==='repeat'){
 const rows=Array.isArray(value)?value:[];
 return <section className="repeat"><div className="question-heading"><h4>{title}</h4>{help}</div>{rows.map((row,index)=><div className="repeat-row" key={index}>{field.sub?.map(sub=><AnswerField key={sub.k} path={`${key}.${index}.`} field={sub} answers={row} onChange={(k,v)=>onChange(field.k,rows.map((r,i)=>i===index?{...r,[k]:v}:r))}/>)}<button type="button" className="ghost" onClick={()=>onChange(field.k,rows.filter((_,i)=>i!==index))}>הסרה</button></div>)}<button type="button" onClick={()=>onChange(field.k,[...rows,{}])}>{field.addLabel||'הוספה'}</button></section>;
 }
 if(field.type==='checks')return <fieldset className="checks" data-answer-key={key} tabIndex={-1} aria-invalid={!!error} aria-describedby={error?errorId:undefined}><legend>{title}</legend><div className="question-heading question-group-help"><span>אפשר לבחור כמה אפשרויות</span>{help}</div>{field.opts?.map(([v,label])=><div className="check-option" key={v}><label><input type="checkbox" checked={Array.isArray(value)&&value.includes(v)} onChange={e=>onChange(field.k,e.target.checked?[...(value||[]),v]:(value||[]).filter((x:string)=>x!==v))}/>{label}</label><QuestionHelp fieldKey={field.k} option={v} label={label}/></div>)}{error&&<p className="field-error" id={errorId}>{error}</p>}</fieldset>;
 return <Field label={`${title}${field.req?' *':''}`} help={help} error={error}>{field.opts?<select data-answer-key={key} aria-required={!!field.req} value={value??''} onChange={e=>onChange(field.k,e.target.value)}><option value="">בחרו…</option>{field.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:<input data-answer-key={key} aria-required={!!field.req} value={value??''} onChange={e=>onChange(field.k,e.target.value)} maxLength={500} min={0} type={['currency','number'].includes(field.type||'')?'number':['date','email','tel'].includes(field.type||'')?field.type:'text'}/>}</Field>;
}
function dynamic(field:DynamicField):LegacyField{return {k:field.key,l:field.label,type:field.type,req:field.required?1:0,opts:field.options?.map(x=>[x,x])};}
export function Questionnaire({family,services,refresh,onDirtyChange,onComplete,advancedEmployment=false,resourceLibraryEnabled=false}:{family:Family;services:Service[];refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void;onComplete:()=>void;advancedEmployment?:boolean;resourceLibraryEnabled?:boolean}){
 const [work,setWork]=useRetainedState<{answers:Answers;saved:string;revision:string|undefined}>('questionnaire:'+family.id,()=>({answers:family.answers||{},saved:JSON.stringify(family.answers||{}),revision:family.updated_at}),v=>JSON.stringify(v.answers)!==v.saved,'השאלון המשפחתי');
 const {answers,saved,revision}=work;
 const setAnswers=(next:Answers|((a:Answers)=>Answers))=>setWork(prev=>({...prev,answers:typeof next==='function'?next(prev.answers):next}));
 const [chapter,setChapter]=useRetainedState('questionnaire-view:'+family.id,()=> 'family');const [showMissing,setShowMissing]=useState(false);
 const [busy,setBusy]=useState(false);const [discard,setDiscard]=useState(false);
 const dirty=JSON.stringify(answers)!==saved;
 function loadLatest(){setWork({answers:family.answers||{},saved:JSON.stringify(family.answers||{}),revision:family.updated_at});setDiscard(false);}
 useEffect(()=>{if(!dirty)loadLatest();},[family.updated_at]);
 useEffect(()=>{onDirtyChange(false);},[onDirtyChange]);
 const progress=chapterProgress(answers);const visible=progress.map(s=>s.chapter);
 const heading=useRef<HTMLDivElement>(null);const focusRequested=useRef(false);
 const current=visible.find(c=>c.key===chapter)||visible[0];const index=visible.indexOf(current);
 const focusChapter=()=>{heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'});};
 const chooseChapter=(key:string)=>{if(key===current.key){focusChapter();return;}focusRequested.current=true;setChapter(key);};
 useEffect(()=>{if(focusRequested.current){focusRequested.current=false;focusChapter();}},[current.key]);
 const set=(k:string,v:unknown)=>setAnswers(prev=>({...prev,[k]:v}));
 const custom=services.filter(s=>s.active&&s.trigger_conditions.every(r=>conditionMatches(answers,r)));
 const issues=questionnaireIssues(answers,services);const errors=showMissing?Object.fromEntries(issues.map(i=>[i.key,i.message])):{};
 const persistDraft=async()=>{const result=await rpc<Family>('rpc_save_family',{p_family_id:family.id,p_patch:{answers},p_expected_updated_at:revision});setWork(prev=>({...prev,saved:JSON.stringify(answers),revision:result.updated_at}));await refresh();};
 const saveDraft=async()=>{setBusy(true);try{await persistDraft();}finally{setBusy(false);}};
 const submitted=family.onboarding_pct===100;
 function jump(key:string,chapterKey:string){setChapter(chapterKey==='custom'?current.key:chapterKey);requestAnimationFrame(()=>{const field=Array.from(document.querySelectorAll<HTMLElement>('[data-answer-key]')).find(el=>el.dataset.answerKey===key);if(field){const details=field.closest('details');if(details)details.open=true;field.focus();field.scrollIntoView({block:'center',behavior:'auto'});}});}
 return <div className="questionnaire-paper"><BrandLogo className="questionnaire-signature"/><BrandLogo mark className="questionnaire-stamp"/><Panel title="השאלון המשפחתי"><AnswerErrors.Provider value={errors}><fieldset disabled={busy} aria-busy={busy}>
 <details className="questionnaire-introduction"><summary>לפני שמתחילים · מה ממלאים ואיך שומרים?</summary><p className="section-intro">ממלאים את מה שידוע לכם, שומרים טיוטה וממשיכים בקצב שלכם. לחצו על סימן השאלה לצד השדות להסבר ולדוגמה. שדות המסומנים בכוכבית (*) נדרשים לשליחה לבדיקה. המידע נשמר רק בלחיצה על שמירה.</p><p>פרטי הזיהוי משייכים את התשובות לאדם הנכון במשפחה. מלאו רק את מה ששייך לכם; תשובות שאינן רלוונטיות לא יוצגו בפרקים הבאים. בדמו משתמשים בפרטים מדומים בלבד.</p><p>אפשר לחזור לכל פרק ולתקן. שדות שמולאו עדיין דורשים שמירה; אפשר להשאיר פרקי רשות ריקים; תשובות שהוזנו נבדקות לפני השליחה.</p><div className="chapter-assistance"><PreparationTip chapter={current.key}/>{current.key==='family'&&<ContactReuse family={family} answers={answers} apply={patch=>setAnswers(a=>({...a,...patch}))}/>}</div></details>
 {family.updated_at!==revision&&<p className="hint" role="status">התיק עודכן בזמן העריכה. הטיוטה שלכם נשארה במסך כדי שלא תאבד. <button className="text-button" onClick={()=>{if(dirty)setDiscard(true);else loadLatest();}}>טעינת התשובות המעודכנות</button></p>}
 {discard&&<div className="hint"><p>להחליף את טיוטת השאלון בתשובות השמורות בתיק?</p><button type="button" onClick={loadLatest}>כן, טעינת התשובות</button><button type="button" onClick={()=>setDiscard(false)}>המשך עריכת הטיוטה</button></div>}
 <div className="questionnaire-status"><span className="questionnaire-position"><span><strong>פרק {index+1} מתוך {visible.length} · {current.title}</strong><small>{index<visible.length-1?`בהמשך: ${visible[index+1].title}`:'זה הפרק האחרון במסלול הנוכחי'}</small></span></span><span role="status">{busy?'שומר את התשובות…':dirty?'יש שינויים שטרם נשמרו בתיק. הם זמינים במעבר בין המסכים.':submitted?'השאלון נשלח בעבר. התשובות המוצגות, כולל עדכונים שנשמרו, זמינות בתיק.':'טיוטה שמורה בתיק · טרם נשלחה לבדיקה.'}</span></div>
 <ChapterProgress compact steps={progress} current={current.key} onSelect={chooseChapter}/>
 <SaveForm key={current.key} protectDraft={false} noValidate label="שמירת טיוטה" successMessage="הטיוטה נשמרה. אפשר להמשיך לפרק הבא או לחזור אליה בהמשך." save={saveDraft}>
 <div className="chapter-heading" ref={heading} tabIndex={-1} aria-label={`פרק ${current.title}`}><span className="chapter-number">{String(index+1).padStart(2,'0')}</span><div><h3>{current.title}</h3><p>{current.desc}</p></div></div>{current.secs.filter(s=>!s.cond||s.cond(answers)).map((s,i)=>{const content=<section className="question-section" key={i}><h4>{s.t}</h4>{s.hint&&<p className="hint">{s.hint}</p>}<div className="fields">{s.fields?.map(f=><AnswerField key={f.k} field={f} answers={answers} onChange={set} advancedEmployment={advancedEmployment}/>)}</div>{s.dyn==='perChild'&&(answers.children||[]).map((child:{name?:string},index:number)=><section key={index}><h4>{child.name||`ילד ${index+1}`}</h4><div className="fields"><AnswerField field={{k:`wt_${index}`,l:'סכום שרוצים להכין לחתונה (₪)',type:'currency'}} answers={answers} onChange={set}/><AnswerField field={{k:`wa_${index}`,l:'באיזה גיל של הילד הכסף צפוי להידרש?',type:'number'}} answers={answers} onChange={set}/></div></section>)}</section>;return s.optional?<details className="optional-questions" key={i}><summary>{s.t}</summary>{content}</details>:content;})}
 {custom.some(s=>s.client_fields.length>0)&&<details><summary>שאלות נוספות לפי תחום</summary>{custom.map(s=><section key={s.id}><h4>{s.name}</h4>{s.client_fields.filter(f=>!f.show_when||conditionMatches(answers,f.show_when)).map(f=><AnswerField key={f.key} field={dynamic(f)} answers={answers} onChange={set}/>)}</section>)}</details>}
 </SaveForm>
 <div className="chapter-actions"><button disabled={index===0} onClick={()=>chooseChapter(visible[index-1].key)}>לפרק הקודם</button>{index<visible.length-1?<AsyncButton action={async()=>{await saveDraft();chooseChapter(visible[index+1].key);}}>שמירה והמשך<Icon name="arrow"/><span className="chapter-next-name">לפרק {visible[index+1]?.title}</span></AsyncButton>:<span className="muted">זה הפרק האחרון. בדקו שהכול נשמר לפני השליחה.</span>}</div>
 {!submitted&&<section className="questionnaire-submit"><h3>סיימתם למלא?</h3><p>השליחה מעבירה את השאלון להמשך התהליך ומציגה מסמכים שנדרשים לפי התחומים. שמירת טיוטה בלבד אינה שולחת אותו.</p>
 <details className="questionnaire-review"><summary>מעבר על הפרקים לפני השליחה</summary><p>אפשר לחזור לכל פרק ולתקן. רק הכפתור ״סיום ושליחת השאלון לבדיקה״ מעביר לשלב הבא.</p><div className="answer-review">{questionnaireReview(answers,services).map((section,i)=><details key={section.key+i}><summary>{section.title} · {section.items.length} תשובות</summary>{section.items.length?<dl>{section.items.map((item,index)=><div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>:<p>לא הוזנו תשובות בפרק זה.</p>}<button className="text-button" onClick={()=>chooseChapter(section.key==='custom'?current.key:section.key)}>חזרה לעריכת הפרק</button></details>)}</div></details><button onClick={()=>setShowMissing(true)}>בדיקת שדות חסרים ותקינות</button>
 {showMissing&&<div className="validation-summary" role="status">{issues.length?<><strong>נותרו {issues.length} שדות להשלמה או לתיקון. לחצו כדי לעבור לשדה:</strong><ul>{issues.map(m=><li key={m.key+m.chapter}><button className="text-button" onClick={()=>jump(m.key,m.chapter)}>{m.label} · {m.message}</button></li>)}</ul></>:<p>בדיקת השדות עברה. כדאי לעבור על הפרטים לפני השליחה.</p>}</div>}
 <SaveForm protectDraft={false} label="סיום ושליחת השאלון לבדיקה" successMessage="השאלון נשלח." save={async()=>{setShowMissing(true);if(issues.length){jump(issues[0].key,issues[0].chapter);throw new Error('VALIDATION');}setBusy(true);try{await persistDraft();await rpc('rpc_complete_onboarding',{p_family_id:family.id});await refresh();onDirtyChange(false);onComplete();}finally{setBusy(false);}}}><p className="muted">לפני השליחה ודאו שגם איש הקשר והטלפון מעודכנים בלשונית הסקירה.</p></SaveForm></section>}
 </fieldset></AnswerErrors.Provider>{resourceLibraryEnabled&&<ResourceLibrary chapter={current.key} version={family.updated_at}/>}</Panel></div>;
}
