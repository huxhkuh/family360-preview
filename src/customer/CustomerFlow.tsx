import {useEffect,useReducer,useRef,useState} from 'react';
import {BrandLogo} from '../branding/Brand';
import {loadWorkspace,selectRole,startClientIntake} from '../lib/backend';
import {DraftContext,useDraftRegistry} from '../lib/draft-guard';
import type {Workspace} from '../lib/model';
import {Questionnaire} from '../families/Questionnaire';
import {AsyncButton} from '../ui';
import {SERVICE_PRICE_AGOROT,money} from '../growth/service-price';
import {BrandCompanion} from './BrandCompanion';
import {customerStage} from './journey';
export function CustomerFlow({onHome,onDashboard,active=true}:{onHome:()=>void;onDashboard:()=>void;active?:boolean}){
 const [stage,dispatch]=useReducer(customerStage,'payment'),[w,setW]=useState<Workspace|null>(null),[paused,setPaused]=useState(false);
 const drafts=useDraftRegistry(),title=useRef<HTMLHeadingElement>(null),paid=useRef(false);
 const family=w?.families.find(f=>f.id==='f1');
 const refresh=async()=>{setW(await loadWorkspace());};
 useEffect(()=>{if(active&&paid.current){selectRole('client');void refresh();}},[active]);
 useEffect(()=>{window.scrollTo(0,0);const heading=Array.from(document.querySelectorAll<HTMLElement>('.customer-flow h1')).find(el=>el.getClientRects().length);heading?.focus({preventScroll:true});},[stage,paused]);
 async function pay(){if(paid.current)return;startClientIntake(new URLSearchParams(location.search).get('ref')||undefined);selectRole('client');await refresh();paid.current=true;dispatch({type:'pay'});}
 const step=stage==='payment'?0:stage==='paid'?1:stage==='questionnaire'?2:3;
 return <DraftContext.Provider value={drafts}><div className="customer-flow client-shell" data-stage={stage}>
  <header className="customer-header"><button onClick={onHome} className="brand-home" aria-label="חזרה לדף הבית"><BrandLogo/></button><span className="customer-header-note">בכל פעם, צעד אחד.</span>{stage==='questionnaire'&&!paused&&<button className="quiet-button" onClick={()=>setPaused(true)}>רגע של הפסקה</button>}</header>
  <div className="customer-path" aria-label="ההתקדמות שלכם"><span style={{width:`${(step+1)*25}%`}}/><p>{['מתחילים לעשות סדר','התשלום התקבל','מכירים את המשפחה','השאלון הושלם'][step]}</p><i aria-hidden="true" style={{insetInlineStart:`calc(${Math.min(94,(step+1)*25)}% - 16px)`}}>●</i></div>
  {stage==='payment'&&<main className="customer-step customer-payment"><div><p className="brand-kicker">הצעד הבא שלכם</p><h1 ref={title} tabIndex={-1}>מתחילים לעשות<br/>סדר. יחד.</h1><p className="customer-lead">מרכזים את הפרטים, מכירים את התמונה שלכם ומכינים את ההמשך עם הנציג.</p><div className="payment-summary"><span>מסודרים 360 · היכרות ובירור כלכלי</span><strong>{money(SERVICE_PRICE_AGOROT)}</strong><small>מחיר כולל · תשלום אחד</small></div><AsyncButton className="primary brand-primary" action={pay}>לתשלום 490 ש״ח והמשך</AsyncButton><p className="payment-disclosure">הדמיית תשלום: הלחיצה מציגה תשלום שהתקבל, ללא חיוב וללא הזנת פרטי כרטיס.</p><button className="text-button" onClick={onHome}>עוד רגע, חזרה לדף הבית</button></div><BrandCompanion full/></main>}
  {stage==='paid'&&<main className="customer-step"><div><span className="brand-tick" aria-hidden="true">✓</span><p className="brand-kicker">התשלום נקלט בהצלחה</p><h1 ref={title} tabIndex={-1}>עכשיו, בואו<br/>נכיר אתכם.</h1><p className="customer-lead">זה החלק שבו מרכיבים את התמונה המשפחתית שלכם, פרק קטן בכל פעם.</p><div className="time-note"><strong>כדאי לפנות כחצי שעה.</strong><p>זו הערכה; הזמן משתנה ממשפחה למשפחה. הכינו פרטי קשר, מספרי זהות ותאריכי לידה. את מה שלא יודעים אפשר להשלים בהמשך עם הנציג.</p></div><button className="primary brand-primary" onClick={()=>dispatch({type:'start'})}>יש לנו זמן. מתחילים בהיכרות ←</button><p className="customer-subtle">אפשר לקחת הפסקה ולחזור כל עוד העמוד נשאר פתוח.</p></div><BrandCompanion pose="explain"/></main>}
  {stage==='questionnaire'&&w&&family&&<main className="customer-questionnaire"><div hidden={paused}><div className="customer-question-intro"><p className="brand-kicker">משימה אחת על השולחן</p><h1 ref={title} tabIndex={-1}>רק הפרק הזה. כל השאר יחכה.</h1></div><Questionnaire focused clientGuide advancedEmployment={w.questionnaireV2Enabled} family={family} services={w.services} documents={w.documents.filter(d=>d.family_id===family.id)} refresh={refresh} onDirtyChange={()=>{}} onComplete={async()=>{const latest=await loadWorkspace();setW(latest);dispatch({type:'submit',submitted:latest.families.some(f=>f.id===family.id&&f.onboarding_pct===100)});}}/></div>{paused&&<section className="customer-step pause-step"><div><p className="brand-kicker">אין לאן למהר</p><h1 ref={title} tabIndex={-1}>נשימה קטנה.<br/>אנחנו כאן.</h1><p className="customer-lead">התשובות נשארות במקום שבו עצרתם כל עוד העמוד פתוח. חוזרים כשנוח לכם.</p><button className="primary brand-primary" onClick={()=>setPaused(false)}>ממשיכים מאותה נקודה ←</button></div><BrandCompanion pose="pause"/></section>}</main>}
  {(stage==='complete'||stage==='dashboard')&&<main className="customer-step customer-complete"><div><span className="brand-tick" aria-hidden="true">✓</span><p className="brand-kicker">המשימה שלכם הושלמה</p><h1 ref={title} tabIndex={-1}>עשיתם את זה.<br/>התמונה מתחילה להתבהר.</h1><p className="customer-lead">השאלון נשלח לנציג. מכאן נעבור על הפרטים ונכין איתכם את ההמשך. אין צורך לעשות עוד משהו ברגע הזה.</p><button className="primary brand-primary" onClick={()=>{if(stage==='complete')dispatch({type:'dashboard'});onDashboard();}}>לאזור האישי שלי ←</button></div><BrandCompanion pose="complete"/></main>}
  <footer className="customer-footer"><span>מסודרים 360 · עושים לך סדר בכסף.</span><span>שאלה קטנה? אפשר להשלים פרטים עם הנציג.</span></footer>
 </div></DraftContext.Provider>;
}
