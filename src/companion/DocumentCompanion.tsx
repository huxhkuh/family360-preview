import {useRef,useState} from 'react';
import {Companion} from './Companion';
import {documentPreparation} from './document-preparation';
import type {Answers} from '../families/questionnaire-definition';
import type {Document} from '../lib/model';
import {useRetainedState} from '../lib/draft-guard';
import {rpc} from '../lib/backend';
import {safeMessage} from '../lib/core';

export function DocumentCompanion({familyId,answers,documents,chapter,beforeAction,refresh,collection=false,submitted=false,suggestionsOnly=false}:{suggestionsOnly?:boolean;familyId:string;answers:Answers;documents:Document[];chapter?:string;beforeAction?:()=>Promise<void>;refresh:()=>Promise<void>;collection?:boolean;submitted?:boolean}){
 const [deferred,setDeferred]=useRetainedState<string[]>('companion-documents:'+familyId,()=>[]);
 const [conflict,setConflict]=useState(false);
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const feedback=useRef<HTMLParagraphElement>(null);
 const all=documentPreparation(answers).filter(p=>!suggestionsOnly||!documents.some(d=>d.family_id===familyId&&d.key===p.key));
 const items=all.filter(p=>(!chapter||p.chapter===chapter)&&!documents.some(d=>d.family_id===familyId&&d.key===p.key&&['pending','approved','signed'].includes(d.status)));
 const attached=all.filter(p=>(!chapter||p.chapter===chapter)&&documents.some(d=>d.family_id===familyId&&d.key===p.key&&['pending','approved','signed'].includes(d.status)));
 if(!items.length&&!attached.length)return null;
 async function act(key:string,later:boolean){
  if(busy)return;setBusy(key);setError('');setNotice('');setConflict(false);
  try{
   await beforeAction?.();
   if(later){setDeferred(prev=>[...new Set([...prev,key])]);setNotice('אפשר לחזור למסמך אם תרצו. אין צורך לצרף אותו כדי להמשיך.');}
   else {await rpc(import.meta.env.VITE_LIVE_MODE?'rpc_prepare_document':'rpc_demo_prepare_document',{p_family_id:familyId,p_key:key});await refresh();setNotice(all.find(p=>p.key===key)?.type==='signature'?'ההרשאה נוספה ללשונית המסמכים להשלמה עם הנציג. לא תועדה הסכמה ולא נשלח מידע.':import.meta.env.VITE_LIVE_MODE?'הבקשה נוספה ללשונית המסמכים. יש להעלות שם קובץ כדי להשלים אותה.':'דוגמת המסמך צורפה וממתינה לבדיקת הנציג. לא הועלה קובץ אמיתי.');requestAnimationFrame(()=>feedback.current?.focus({preventScroll:true}));}
  }catch(e){setConflict(e instanceof Error&&e.message.includes('CONFLICT'));setError(safeMessage(e));}finally{setBusy(null);}
 }
 const waiting=items.length>0&&items.every(p=>deferred.includes(p.key));
 return <section className="document-companion" aria-label={collection?'רשימת המסמכים לפי התשובות':'מסמכים לפרק הנוכחי'}>
 <Companion pose={!items.length?'success':waiting?'later':'document'} title={!items.length?'המסמכים שצירפתם כבר בתיק':collection?'מסמכי רשות לפי התשובות שלכם':'יש לכם מסמך מתאים? אפשר לצרף'}>
  <p>{!items.length?'המסמכים כבר צורפו. מצב הבדיקה מופיע בלשונית המסמכים.':submitted?'אפשר לצרף אם יש לכם. אפשר גם להמשיך בלי מסמכים ולברר יחד עם הנציג.':waiting?'אפשר להמשיך בשאלון. המסמכים זמינים כאן אם תרצו לחזור אליהם.':'המסמכים יכולים לעזור לבדיקה, אבל אינם חובה. אפשר להמשיך לפרק הבא בלי לצרף ובלי לסמן דבר.'}</p>
  {!!items.length&&<small>{import.meta.env.VITE_LIVE_MODE?'הקבצים יועלו בלשונית המסמכים לאחר הוספת הבקשה.':'בדמו מצרפים דוגמה בלבד, ללא קובץ אישי.'}{items.some(p=>p.type==='signature')&&' הרשאה למסלקה נדרשת לפני פנייה אליה. אפשר לחתום בכרטיס ההרשאה בלשונית המסמכים.'}</small>}
  {items.map(p=><div className="companion-document-row" key={p.key} data-preparation-key={p.key}>
   <div><strong>{p.name}</strong><small className="preparation-kind">{p.type==='signature'?'חתימה לפני פנייה למסלקה':documents.some(d=>d.family_id===familyId&&d.key===p.key&&!d.optional)?'בקשה פרטנית מהנציג':documents.some(d=>d.family_id===familyId&&d.key===p.key)?'בתיק · רשות':'רשות'}</small><details><summary>איך המסמך עוזר ואיפה מוצאים?</summary><p>{p.reason}</p><p>{p.source}</p><p>תקופה: {p.period}</p></details>
   {documents.find(d=>d.family_id===familyId&&d.key===p.key)?.reject_reason&&<p className="error">{documents.find(d=>d.family_id===familyId&&d.key===p.key)?.reject_reason}</p>}</div>
   <div className="companion-actions"><button type="button" disabled={!!busy||(p.type==='signature'&&documents.some(d=>d.key===p.key&&d.family_id===familyId))} onClick={()=>act(p.key,false)}>{busy===p.key?'בתהליך…':p.type==='signature'?'הוספת הרשאה להשלמה עם הנציג':import.meta.env.VITE_LIVE_MODE?'הוספת בקשה למסמך':'צירוף דוגמה'}</button>
   {!collection&&<button type="button" className="text-button" aria-pressed={deferred.includes(p.key)} disabled={!!busy} onClick={()=>act(p.key,true)}>{deferred.includes(p.key)?'השארנו להמשך':'אולי בהמשך'}</button>}</div>
  </div>)}
  {!!attached.length&&<p className="companion-attached">כבר צורפו לתיק: {attached.map(p=>p.name).join(' · ')}</p>}
  <p ref={feedback} tabIndex={-1} role="status" className="companion-feedback">{busy?'שמירת התשובות ועדכון רשימת המסמכים…':notice}</p>
  {error&&<p role="alert" className="error">{error} {conflict?"הטיוטה נשארה במסך. חזרו לשאלון ובדקו את הודעת העדכון לפני ניסיון נוסף.":"התשובות נשארו במסך. אפשר לנסות שוב."}</p>}
 </Companion>
 </section>;
}
