import {useRef,useState} from 'react';
import {Companion} from './Companion';
import {documentPreparation} from './document-preparation';
import type {Answers} from '../families/questionnaire-definition';
import type {Document} from '../lib/model';
import {useRetainedState} from '../lib/draft-guard';
import {rpc} from '../lib/backend';
import {safeMessage} from '../lib/core';

export function DocumentCompanion({familyId,answers,documents,chapter,beforeAction,refresh,collection=false}:{familyId:string;answers:Answers;documents:Document[];chapter?:string;beforeAction?:()=>Promise<void>;refresh:()=>Promise<void>;collection?:boolean}){
 const [deferred,setDeferred]=useRetainedState<string[]>('companion-documents:'+familyId,()=>[]);
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const feedback=useRef<HTMLParagraphElement>(null);
 const all=documentPreparation(answers);
 const items=all.filter(p=>(!chapter||p.chapter===chapter)&&!documents.some(d=>d.family_id===familyId&&d.key===p.key&&['pending','approved','signed'].includes(d.status)));
 const attached=all.filter(p=>(!chapter||p.chapter===chapter)&&documents.some(d=>d.family_id===familyId&&d.key===p.key&&['pending','approved','signed'].includes(d.status)));
 if(!items.length&&!attached.length)return null;
 async function act(key:string,later:boolean){
  if(busy)return;setBusy(key);setError('');setNotice('');
  try{
   await beforeAction?.();
   if(later){setDeferred(prev=>[...new Set([...prev,key])]);setNotice('נשאר ברשימת ההשלמה. אפשר להמשיך בשאלון ולחזור למסמך בסוף.');}
   else {await rpc('rpc_demo_prepare_document',{p_family_id:familyId,p_key:key});await refresh();setNotice('דוגמת המסמך צורפה וממתינה לבדיקת הנציג. לא הועלה קובץ אמיתי.');requestAnimationFrame(()=>feedback.current?.focus({preventScroll:true}));}
  }catch(e){setError(safeMessage(e));}finally{setBusy(null);}
 }
 const waiting=items.length>0&&items.every(p=>deferred.includes(p.key));
 return <section className="document-companion" aria-label={collection?'רשימת המסמכים לפי התשובות':'מסמכים לפרק הנוכחי'}>
 <Companion pose={!items.length?'success':waiting?'later':'document'} title={!items.length?'המסמכים שצירפתם כבר בתיק':collection?'כל המסמכים שהכנו בדרך':'נכין גם את המסמכים המתאימים?'}>
  <p>{!items.length?'אין צורך לצרף שוב. בדיקת המסמכים נשארת אצל הנציג.':waiting?'אפשר להמשיך בנחת. הרשימה מחכה לכם גם בסוף השאלון.':'לפי התשובות שלכם, המסמכים האלה יעזרו להשלמת התמונה. אפשר לצרף עכשיו או לרכז הכול לסוף.'}</p>
  {!!items.length&&<small>הכנה להמחשת התהליך בדמו; הנציג מאשר את הדרישה האישית. כאן מצרפים דוגמה מדומה בלבד.</small>}
  {items.map(p=><div className="companion-document-row" key={p.key} data-preparation-key={p.key}>
   <div><strong>{p.name}</strong><details><summary>למה צריך ואיפה מוצאים?</summary><p>{p.reason}</p><p>{p.source}</p><p>תקופה: {p.period}</p></details>
   {documents.find(d=>d.family_id===familyId&&d.key===p.key)?.reject_reason&&<p className="error">{documents.find(d=>d.family_id===familyId&&d.key===p.key)?.reject_reason}</p>}</div>
   <div className="companion-actions"><button type="button" disabled={!!busy} onClick={()=>act(p.key,false)}>{busy===p.key?'בתהליך…':'צירוף דוגמה עכשיו'}</button>
   {!collection&&<button type="button" className="text-button" aria-pressed={deferred.includes(p.key)} disabled={!!busy} onClick={()=>act(p.key,true)}>{deferred.includes(p.key)?'ברשימה להשלמה בסוף':'אשלים בסוף'}</button>}</div>
  </div>)}
  {!!attached.length&&<p className="companion-attached">כבר צורפו לתיק: {attached.map(p=>p.name).join(' · ')}</p>}
  <p ref={feedback} tabIndex={-1} role="status" className="companion-feedback">{busy?'שומרים ומעדכנים את הבקשה…':notice}</p>
  {error&&<p role="alert" className="error">{error} התשובות נשארו במסך. אפשר לנסות שוב.</p>}
 </Companion>
 </section>;
}
