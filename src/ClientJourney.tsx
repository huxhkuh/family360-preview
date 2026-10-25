import {SERVICE_PRICE_AGOROT,money} from './growth/service-price';
import {CompanionPortrait} from './companion/Companion';
import type {Family,Workspace} from './lib/model';
import type {Destination} from './lib/workflow';
import {clientIntake} from './lib/client-intake';
import {useWorkingDrafts} from './lib/draft-guard';
import {hasQuestionnaireAnswers} from './families/chapter-progress';

export function ClientJourney({family,w,onNavigate,activeTarget,compact=false}:{family:Family;w:Workspace;onNavigate:(target:Destination)=>void;activeTarget?:Destination;compact?:boolean}){
 const flow=clientIntake(family,w);const home=!compact&&!activeTarget;
 const draft=useWorkingDrafts().get('questionnaire:'+family.id)?.value as {answers?:unknown}|undefined;
 if(!flow.submitted&&flow.action.target==='questionnaire'&&hasQuestionnaireAnswers(draft?.answers))flow.action={...flow.action,label:'המשך מילוי השאלון'};
 const steps=[
  {title:'תשלום',status:'לא פעיל בדמו',description:`מחיר השירות: ${money(SERVICE_PRICE_AGOROT)}, כולל הכול. התשלום אינו פעיל בדמו.`},
  {title:'מילוי שאלון',status:flow.submitted?'נשלח לבדיקה':'למילוי ושליחה',description:'פרטי המשפחה והנושאים שתרצו לבדוק.',target:'questionnaire' as Destination},
  {title:'צירוף מסמכים',status:flow.missing.length?`${flow.missing.length} להשלמה`:flow.pending.length?`${flow.pending.length} בבדיקה`:flow.documents.length&&flow.documents.every(d=>['approved','signed'].includes(d.status))?'אושרו או נחתמו':flow.documents.length?'בטיפול':'אין כרגע בקשות',description:'מסמכי ההכנה הם רשות; אפשר להשלים עם הנציג.',target:'documents' as Destination},
  {title:'המשך עם הנציג',status:flow.terminal?'לעיון בתיק':flow.stage===3?(flow.pending.length?'ממתינים לבדיקת הנציג':'שיחות ומעקב'):'לאחר השלמת הפרטים',description:'הנציג בודק את החומר ומתאם איתכם את ההמשך.',target:'meetings' as Destination},
 ];
 const content=<>
  <header className="intake-caption"><p className="eyebrow">המסלול שלכם <span aria-hidden="true">/</span> {flow.submitted?`שלב ${flow.stage+1} מתוך 4`:"בדמו מתחילים בשאלון"}</p><p>ממלאים שאלון, מצרפים מסמכים אם יש, וממשיכים עם הנציג.</p></header>
  <div className="intake-lead"><div className="intake-next">{home&&!flow.submitted&&<CompanionPortrait pose="welcome"/>}<div><p className="eyebrow">מה עושים עכשיו?</p><h2>{flow.action.title}</h2><p>{flow.action.detail}</p></div>{flow.action.target!==activeTarget&&<button className="primary" onClick={()=>onNavigate(flow.action.target)}>{flow.action.label}</button>}</div>{home&&!flow.submitted&&<aside className="intake-preparation" aria-label="לפני שמתחילים"><p className="eyebrow">לפני שמתחילים</p><ul><li><strong>מה כדאי להכין</strong><span>פרטי קשר, מספרי תעודות זהות ותאריכי לידה. בדמו משתמשים בפרטים מדומים בלבד.</span></li><li><strong>מה חייבים למלא</strong><span>רק שדות עם כוכבית נדרשים לשליחה. השאלות משתנות לפי התשובות שלכם.</span></li><li><strong>אפשר לעצור בדרך</strong><span>אפשר לשמור טיוטה ולהמשיך בין המסכים. רענון או סגירת הדמו אינם שומרים את ההתקדמות לביקור הבא.</span></li></ul></aside>}</div>
  <ol className="intake-steps" aria-label="שלבי התהליך">{steps.map((step,i)=><li key={step.title} aria-current={i===flow.stage?'step':undefined}><span className="intake-number">{i+1}</span><div><h3>{step.title}</h3><strong className="intake-status">{step.status}</strong><p>{step.description}</p>{step.target&&step.target!==activeTarget&&<button className="text-button" onClick={()=>onNavigate(step.target!)}>{i===1?'פתיחת השאלון':i===2?'אילו מסמכים אפשר לצרף?':'לשיחות ולסיכומים'}</button>}</div></li>)}</ol>
  <details className="intake-payment"><summary>מה לגבי התשלום בדמו?</summary><p>מחיר השירות הוא 490 ₪, כולל הכול. ספק הסליקה עדיין לא חובר. אין כאן חיוב או אישור תשלום, ואיננו מבקשים פרטי אשראי. אפשר להמשיך להתנסות בשאלון ובמסמכים.</p></details>

  {flow.stage===3&&!flow.terminal&&<p className="intake-owner">הנציג המטפל: <strong>{w.representatives.find(r=>r.id===family.representative_id)?.name||'טרם שויך נציג'}</strong>. מועד החזרה עדיין לא נקבע; עדכונים ובקשות נוספות יופיעו בתיק.</p>}
 </>;
 return <section className={`client-intake${compact?' intake-compact':''}${home?' intake-home':''}`} aria-label="המסלול שלכם, צעד אחר צעד">{compact&&['questionnaire','documents'].includes(activeTarget||'')?<details className="questionnaire-context"><summary>המסלול שלכם · תשלום, שאלון, מסמכים והמשך עם הנציג</summary>{content}</details>:content}</section>;
}
