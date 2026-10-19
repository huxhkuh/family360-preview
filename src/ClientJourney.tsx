import type {Family,Workspace} from './lib/model';
import type {Destination} from './lib/workflow';
import {clientIntake} from './lib/client-intake';

export function ClientJourney({family,w,onNavigate,activeTarget,compact=false}:{family:Family;w:Workspace;onNavigate:(target:Destination)=>void;activeTarget?:Destination;compact?:boolean}){
 const flow=clientIntake(family,w);const home=!compact&&!activeTarget;
 const steps=[
  {title:'תשלום',status:'לא פעיל בדמו',description:'המחיר ואפשרות התשלום יוצגו כאן כשייקבעו.'},
  {title:'מילוי שאלון',status:flow.submitted?'נשלח לבדיקה':'למילוי ושליחה',description:'פרטי המשפחה והנושאים שתרצו לבדוק.',target:'questionnaire' as Destination},
  {title:'צירוף מסמכים',status:flow.missing.length?`${flow.missing.length} להשלמה`:flow.pending.length?`${flow.pending.length} בבדיקה`:flow.documents.length&&flow.documents.every(d=>['approved','signed'].includes(d.status))?'אושרו או נחתמו':flow.documents.length?'בטיפול':'אין כרגע בקשות',description:'רק המסמכים וההרשאות שהתבקשו בתיק שלכם.',target:'documents' as Destination},
  {title:'המשך עם הנציג',status:flow.terminal?'לעיון בתיק':flow.stage===3?(flow.pending.length?'ממתינים לבדיקת הנציג':'שיחות ומעקב'):'לאחר השלמת הפרטים',description:'הנציג בודק את החומר ומתאם איתכם את ההמשך.',target:'meetings' as Destination},
 ];
 const content=<>
  <header className="intake-caption"><p className="eyebrow">המסלול שלכם <span aria-hidden="true">/</span> שלב {flow.stage+1} מתוך 4</p><p>תשלום, שאלון, מסמכים — ואז הנציג ממשיך איתכם.</p></header>
  <div className="intake-lead"><div className="intake-next"><div><p className="eyebrow">מה עושים עכשיו?</p><h2>{flow.action.title}</h2><p>{flow.action.detail}</p></div>{flow.action.target!==activeTarget&&<button className="primary" onClick={()=>onNavigate(flow.action.target)}>{flow.action.label}</button>}</div>{home&&!flow.submitted&&<aside className="intake-preparation" aria-label="לפני שמתחילים"><p className="eyebrow">לפני שמתחילים</p><h3>קצת היכרות.<br/>ומשם, תמונה מלאה יותר.</h3><ul><li><strong>מה כדאי להכין</strong><span>פרטי קשר ותאריכי לידה. בהמשך אפשר להיעזר בדוחות ובתלושים.</span></li><li><strong>מה חייבים למלא</strong><span>רק שדות עם כוכבית נדרשים לשליחה. השאלות משתנות לפי התשובות שלכם.</span></li><li><strong>אפשר לעצור בדרך</strong><span>שומרים טיוטה וממשיכים בין המסכים. בדמו, רענון הדפדפן מאפס את הנתונים.</span></li></ul></aside>}</div>
  <ol className="intake-steps" aria-label="שלבי התהליך">{steps.map((step,i)=><li key={step.title} aria-current={i===flow.stage?'step':undefined}><span className="intake-number">{i+1}</span><div><h3>{step.title}</h3><strong className="intake-status">{step.status}</strong><p>{step.description}</p>{step.target&&step.target!==activeTarget&&<button className="text-button" onClick={()=>onNavigate(step.target!)}>{i===1?'פתיחת השאלון':i===2?'אילו מסמכים נדרשים?':'לשיחות ולסיכומים'}</button>}</div></li>)}</ol>
  <details className="intake-payment"><summary>מה לגבי התשלום בדמו?</summary><p>עדיין לא נקבעו מחיר וספק סליקה. אין כאן חיוב או אישור תשלום, ואיננו מבקשים פרטי אשראי. אפשר להמשיך להתנסות בשאלון ובמסמכים.</p></details>

  {flow.stage===3&&!flow.terminal&&<p className="intake-owner">הנציג המטפל: <strong>{w.representatives.find(r=>r.id===family.representative_id)?.name||'טרם שויך נציג'}</strong>. אין כרגע מועד התחייבות לחזרה; עדכונים ובקשות נוספות יופיעו בתיק.</p>}
 </>;
 return <section className={`client-intake${compact?' intake-compact':''}${home?' intake-home':''}`} aria-label="המסלול שלכם, צעד אחר צעד">{compact&&activeTarget==='questionnaire'?<details className="questionnaire-context"><summary>המסלול שלכם · תשלום, שאלון, מסמכים והמשך עם הנציג</summary>{content}</details>:content}</section>;
}
