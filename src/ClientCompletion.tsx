import type {Family,Workspace} from './lib/model';

// A completion message must not conceal other work still assigned to the client.
export function clientReadyToWait(family:Family,w:Workspace){
 if(w.familyWorkTruncated||w.followUpsTruncated)return false;
 const docs=w.documents.filter(d=>d.family_id===family.id);
 const openTask=[...w.familyTasks,...w.followUps.filter(t=>!t.item_id||w.meetingItems.some(i=>i.id===t.item_id&&i.visible_to_client))].some(t=>t.family_id===family.id&&t.visible_to_client&&t.owner_role==='client'&&['open','in_progress'].includes(t.status));
 return family.onboarding_pct===100&&!['completed','archived'].includes(family.status)&&!openTask&&docs.length>0&&docs.every(d=>['pending','approved','signed'].includes(d.status));
}
export function ClientCompletion({family,w}:{family:Family;w:Workspace}){
 if(!clientReadyToWait(family,w))return null;
 const pending=w.documents.some(d=>d.family_id===family.id&&d.status==='pending');
 return <section className="client-completion" aria-label="סיום הפעולות הנדרשות כרגע" role="status"><span className="completion-mark" aria-hidden="true">✓</span><div><p className="eyebrow">מכאן ממשיכים יחד</p><h2>סיימתם את הפעולות שנדרשו כרגע.</h2><p>{pending?'השאלון נשלח והמסמכים ממתינים לבדיקה. אין צורך לצרף אותם שוב.':'השאלון נשלח והמסמכים אושרו או נחתמו. הנציג מרכז את המשך הטיפול.'}</p><p className="completion-owner">הנציג המטפל: <strong>{w.representatives.find(r=>r.id===family.representative_id)?.name||'טרם שויך נציג'}</strong> · מועד החזרה טרם נקבע. בקשות נוספות יופיעו בתיק.</p></div></section>;
}
