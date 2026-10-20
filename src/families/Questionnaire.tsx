import {initialAnswers,toggleAnswer} from './questionnaire-decisions';
import {EmploymentFields} from './EmploymentFields';
import {ChapterCompanion} from '../companion/Companion';
import {DocumentCompanion} from '../companion/DocumentCompanion';
import {documentPreparation} from '../companion/document-preparation';
import {BrandLogo} from '../branding/Brand';
import {questionnaireReview} from './questionnaire-review';
import {ChapterProgress} from './ChapterProgress';
import {chapterProgress,hasQuestionnaireAnswers} from './chapter-progress';
import {useRetainedState} from '../lib/draft-guard';
import {ResourceLibrary} from '../resources/ResourceLibrary';
import {ContactReuse} from './ContactReuse';
import {PreparationTip} from './PreparationTip';
import {createContext,useContext,useId,useEffect,useRef,useState} from 'react';
import {type Answers,type LegacyField} from './questionnaire-definition';
import type {Family,Service,Document,Field as DynamicField} from '../lib/model';
import {AsyncButton,Field,SaveForm,Panel} from '../ui';
import {conditionMatches} from '../lib/core';
import {rpc} from '../lib/backend';
import {Icon} from '../icons';
import {employmentValues,toggleEmployment} from '../lib/employment';
import {QuestionHelp} from './QuestionHelp';
import {DatePicker} from './DatePicker';
import {isoDate} from './date-calendar';
import './questionnaire-help.css';
import './questionnaire-sections.css';
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
 return <section className="repeat"><div className="question-heading"><h4>{title}</h4>{help}</div>{rows.map((row,index)=><div className="repeat-row" key={index}>{field.sub?.map(sub=><AnswerField key={sub.k} path={`${key}.${index}.`} field={sub} answers={row} onChange={(k,v)=>onChange(field.k,rows.map((r,i)=>i===index?{...r,[k]:v}:r))}/>)}<button type="button" className="ghost" aria-label={`הסרת ${title} ${index+1}`} onClick={()=>onChange(field.k,rows.filter((_,i)=>i!==index))}>הסרת {title}</button></div>)}<button type="button" onClick={()=>onChange(field.k,[...rows,{}])}>{field.addLabel||'הוספה'}</button></section>;
 }
 if(field.type==='checks')return <fieldset className="checks" data-answer-key={key} tabIndex={-1} aria-invalid={!!error} aria-describedby={error?errorId:undefined}><legend>{title}</legend><div className="question-heading question-group-help"><span>אפשר לבחור כמה אפשרויות</span>{help}</div>{field.opts?.map(([v,label])=><div className="check-option" key={v}><label><input type="checkbox" checked={Array.isArray(value)&&value.includes(v)} onChange={e=>onChange(field.k,toggleAnswer(value,v,e.target.checked,field.exclusive))}/>{label}</label><QuestionHelp fieldKey={field.k} option={v} label={label}/></div>)}{error&&<p className="field-error" id={errorId}>{error}</p>}</fieldset>;
 return <Field label={`${title}${field.req?' *':''}`} help={help} error={error}>{field.opts?<select data-answer-key={key} aria-required={!!field.req} value={value??''} onChange={e=>onChange(field.k,e.target.value)}><option value="">בחרו…</option>{field.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>:field.type==='date'?<DatePicker data-answer-key={key} aria-required={!!field.req} label={title} value={value??''} max={/(^|_)dob$/.test(field.k)?isoDate(new Date()):undefined} onValueChange={v=>onChange(field.k,v)}/>:<input data-answer-key={key} aria-required={!!field.req} value={value??''} onChange={e=>onChange(field.k,e.target.value)} placeholder={field.type==='approx-date'?'למשל 2018 או 2018-06':undefined} dir={field.type==='approx-date'?'ltr':undefined} maxLength={500} min={0} type={['currency','number'].includes(field.type||'')?'number':['date','email','tel'].includes(field.type||'')?field.type:'text'}/>}</Field>;
}
function dynamic(field:DynamicField):LegacyField{return {k:field.key,l:field.label,type:field.type,req:field.required?1:0,opts:field.options?.map(x=>[x,x])};}
export function Questionnaire({family,services,refresh,onDirtyChange,onComplete,onEditContact,advancedEmployment=false,resourceLibraryEnabled=false,clientGuide=false,documents=[]}:{clientGuide?:boolean;documents?:Document[];family:Family;services:Service[];refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void;onComplete:()=>void;onEditContact?:()=>void;advancedEmployment?:boolean;resourceLibraryEnabled?:boolean}){
 const [work,setWork]=useRetainedState<{answers:Answers;saved:string;revision:string|undefined}>('questionnaire:'+family.id,()=>({answers:initialAnswers(family),saved:JSON.stringify(initialAnswers(family)),revision:family.updated_at}),v=>JSON.stringify(v.answers)!==v.saved,'השאלון המשפחתי');
 const {answers,saved,revision}=work;
 const setAnswers=(next:Answers|((a:Answers)=>Answers))=>setWork(prev=>({...prev,answers:typeof next==='function'?next(prev.answers):next}));
 const [chapter,setChapter]=useRetainedState('questionnaire-view:'+family.id,()=> 'family');const [showMissing,setShowMissing]=useState(false);
 const [busy,setBusy]=useState(false);const [discard,setDiscard]=useState(false);
 const dirty=JSON.stringify(answers)!==saved;
 function loadLatest(){setWork({answers:initialAnswers(family),saved:JSON.stringify(initialAnswers(family)),revision:family.updated_at});setDiscard(false);}
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
 function jump(key:string,chapterKey:string){setChapter(chapterKey==='custom'?current.key:chapterKey);requestAnimationFrame(()=>{const field=Array.from(document.querySelectorAll<HTMLElement>('[data-answer-key]')).find(el=>el.dataset.answerKey===key);if(field){let parent=field.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}field.focus();field.scrollIntoView({block:'center',behavior:'auto'});}});}
 return <div className="questionnaire-paper"><BrandLogo className="questionnaire-signature"/><BrandLogo mark className="questionnaire-stamp"/><Panel title="השאלון המשפחתי"><AnswerErrors.Provider value={errors}><fieldset disabled={busy} aria-busy={busy}>
 <details className="questionnaire-introduction"><summary>לפני שמתחילים · מה ממלאים ואיך שומרים?</summary><p className="section-intro">רק שדות עם כוכבית (*) נדרשים לשליחה. את יתר השדות אפשר להשאיר ריקים ולהשלים עם הנציג. להסבר על שאלה, לחצו על סימן השאלה שלצדה.</p><p>שאלות נוספות יופיעו לפי התשובות שלכם. בדמו משתמשים בפרטים מדומים בלבד.</p><p>״שמירת טיוטה״ שומרת בלי לעבור פרק; ״שמירה והמשך״ שומרת ועוברת לפרק הבא. אפשר לחזור ולתקן. רענון או סגירת הדמו אינם שומרים את ההתקדמות לביקור הבא.</p><div className="chapter-assistance"><PreparationTip chapter={current.key}/>{current.key==='family'&&<ContactReuse family={family} answers={answers} apply={patch=>setAnswers(a=>({...a,...patch}))}/>}</div></details>
 {family.updated_at!==revision&&<p className="hint" role="status">התיק השתנה מאז שהתחלתם לערוך. הטיוטה עדיין מוצגת כאן. בדקו את התשובות השמורות לפני שמירה נוספת. <button className="text-button" onClick={()=>{if(dirty)setDiscard(true);else loadLatest();}}>טעינת התשובות המעודכנות</button></p>}
 {discard&&<div className="hint"><p>טעינת התשובות השמורות תחליף את הטיוטה שבמסך. השינויים שלא נשמרו יאבדו.</p><button type="button" onClick={loadLatest}>החלפת הטיוטה בתשובות השמורות</button><button type="button" onClick={()=>setDiscard(false)}>המשך עריכת הטיוטה</button></div>}
 <div className="questionnaire-status"><span className="questionnaire-position"><span><strong>פרק {index+1} מתוך {visible.length} · {current.title}</strong><small>{index<visible.length-1?`בהמשך: ${visible[index+1].title}`:'זה הפרק האחרון במסלול הנוכחי'}</small></span></span><span role="status">{busy?'שמירת התשובות…':dirty?'יש שינויים שלא נשמרו. הם נשארים במסך במעבר בין הפרקים.':submitted?'השאלון נשלח בעבר. התשובות המוצגות, כולל עדכונים שנשמרו, זמינות בתיק.':hasQuestionnaireAnswers(family.answers)?'הטיוטה נשמרה. היא עדיין לא נשלחה לבדיקה.':'עדיין לא מילאתם את השאלון'}</span></div>
 <ChapterProgress compact steps={progress} current={current.key} onSelect={chooseChapter}/>
 <SaveForm key={current.key} protectDraft={false} noValidate label="שמירת טיוטה" successMessage="הטיוטה נשמרה. אפשר להמשיך בין המסכים; רענון הדמו מאפס את הנתונים." save={saveDraft}>
 <div className="chapter-heading" ref={heading} tabIndex={-1} aria-label={`פרק ${current.title}`}><span className="chapter-number">{String(index+1).padStart(2,'0')}</span><div><h3>{current.title}</h3>{clientGuide?<ChapterCompanion key={current.key} chapter={current.key} description={current.desc}/>:<p>{current.desc}</p>}</div></div>{current.secs.filter(s=>!s.cond||s.cond(answers)).map((s,i)=>{const content=<section className="question-section" key={i}><h4>{s.t}</h4>{s.hint&&<p className="hint">{s.hint}</p>}{clientGuide&&current.key==='work'?<EmploymentFields fields={s.fields||[]} answers={answers} errors={errors} renderField={f=><AnswerField key={f.k} field={f} answers={answers} onChange={set} advancedEmployment={advancedEmployment}/>}/>:<div className="fields">{s.fields?.map(f=><AnswerField key={f.k} field={f} answers={answers} onChange={set} advancedEmployment={advancedEmployment}/>)}</div>}{s.dyn==='perChild'&&(answers.children||[]).map((child:{name?:string},index:number)=><section key={index}><h4>{child.name||`ילד ${index+1}`}</h4><div className="fields"><AnswerField field={{k:`wt_${index}`,l:'סכום שרוצים להכין לחתונה (₪)',type:'currency'}} answers={answers} onChange={set}/><AnswerField field={{k:`wa_${index}`,l:`באיזה גיל של ${child.name||'הילד'} תרצו שהסכום יהיה מוכן?`,type:'number'}} answers={answers} onChange={set}/></div></section>)}</section>;return s.optional?<details className="optional-questions" key={i}><summary>{s.t}</summary>{content}</details>:content;})}

 {custom.some(s=>s.client_fields.length>0)&&<details><summary>שאלות נוספות לפי תחום</summary>{custom.map(s=><section key={s.id}><h4>{s.name}</h4>{s.client_fields.filter(f=>!f.show_when||conditionMatches(answers,f.show_when)).map(f=><AnswerField key={f.key} field={dynamic(f)} answers={answers} onChange={set}/>)}</section>)}</details>}
 </SaveForm>
 <p className="chapter-end-label">סוף הפרק · {current.title}</p>
 <div className="chapter-actions"><button disabled={index===0} onClick={()=>chooseChapter(visible[index-1].key)}>לפרק הקודם</button>{index<visible.length-1?<AsyncButton action={async()=>{await saveDraft();chooseChapter(visible[index+1].key);}}>שמירה והמשך<Icon name="arrow"/><span className="chapter-next-name">לפרק {visible[index+1]?.title}</span></AsyncButton>:<span className="muted">זה הפרק האחרון. אפשר לעבור לסיכום ולשלוח לבדיקה.</span>}</div>
 </fieldset></AnswerErrors.Provider></Panel>
 <fieldset className="questionnaire-after" disabled={busy} aria-busy={busy}>
 {clientGuide&&<DocumentCompanion familyId={family.id} answers={answers} documents={documents} chapter={current.key} submitted={submitted} beforeAction={saveDraft} refresh={refresh}/>}
 {clientGuide&&documentPreparation(answers).length>0&&<section className="questionnaire-support-card" aria-label="מסמכים והשלמות"><h2>מסמכים והשלמות</h2><p className="muted">כל המסמכים ברשימה הם רשות. אפשר לשלוח את השאלון ולהשלים אותם עם הנציג.</p><details className="companion-document-summary"><summary>רשימת המסמכים להכנה</summary><DocumentCompanion familyId={family.id} answers={answers} documents={documents} beforeAction={saveDraft} refresh={refresh} collection submitted={submitted}/></details></section>}
 {!submitted&&<section className="questionnaire-submit questionnaire-support-card" aria-label="בדיקה ושליחת השאלון"><h3>בדיקה ושליחת השאלון</h3><p>בדקו את הפרטים ושלחו לבדיקה. שמירת טיוטה אינה שולחת את השאלון.</p>
 <details className="questionnaire-review"><summary>מעבר על הפרקים לפני השליחה</summary><p>אפשר לחזור לכל פרק ולתקן. סכומי הכנסה, שכירות ומשכנתא שלא מולאו מסומנים כאן להשלמה עם הנציג. רק הכפתור ״שליחת השאלון לבדיקה״ מעביר לשלב הבא.</p><div className="answer-review">{questionnaireReview(answers,services).map((section,i)=><details key={section.key+i}><summary>{section.title} · {section.items.length===1?"פרט אחד":`${section.items.length} פרטים`}</summary>{section.items.length?<dl>{section.items.map((item,index)=><div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>:<p>לא הוזנו תשובות בפרק זה.</p>}<button className="text-button" onClick={()=>chooseChapter(section.key==='custom'?current.key:section.key)}>חזרה לעריכת הפרק</button></details>)}</div></details><button onClick={()=>setShowMissing(true)}>בדיקה לפני שליחה</button>
 {showMissing&&<div className="validation-summary" role="status">{issues.length?<><strong>{issues.length===1?'נותר שדה אחד להשלמה או לתיקון':`נותרו ${issues.length} שדות להשלמה או לתיקון`}. לחצו כדי לעבור לשדה:</strong><ul>{issues.map(m=><li key={m.key+m.chapter}><button className="text-button" onClick={()=>jump(m.key,m.chapter)}>{m.label} · {m.message}</button></li>)}</ul></>:<p>לא נמצאו שדות חובה חסרים או שגיאות במבנה התשובות. אפשר לעבור על הסיכום ולשלוח.</p>}</div>}
 <SaveForm protectDraft={false} label="שליחת השאלון לבדיקה" busyLabel="שמירה ושליחה…" successMessage="השאלון נשלח." save={async()=>{setShowMissing(true);if(issues.length){jump(issues[0].key,issues[0].chapter);throw new Error('QUESTIONNAIRE_INCOMPLETE');}setBusy(true);try{await persistDraft();await rpc('rpc_complete_onboarding',{p_family_id:family.id});await refresh();onDirtyChange(false);onComplete();}finally{setBusy(false);}}}><div className="questionnaire-contact"><p><strong>איש הקשר לתיאום:</strong> {family.contact_name||"טרם הוגדר"} · <bdi>{family.phone||"לא הוגדר טלפון"}</bdi></p><p className="muted">הטלפון שבתיק מופיע בתחילת השאלון. שינוי ושמירה של מספר תקין כאן יעדכנו גם את הטלפון בתיק. מספר לא תקין נשמר רק בטיוטה עד לתיקון.</p>{onEditContact&&<button type="button" className="text-button" onClick={onEditContact}>עדכון פרטי הקשר</button>}</div></SaveForm></section>}
 </fieldset>{resourceLibraryEnabled&&<ResourceLibrary chapter={current.key} version={family.updated_at}/>}</div>;
}
