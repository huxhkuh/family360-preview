import {supportClosed} from './lib/case-policy';
import {useState} from 'react';
import type {FamilyTask,FollowUp,Workspace} from './lib/model';
import {rpc} from './lib/backend';
import {useRetainedState} from './lib/draft-guard';
import {AsyncButton,Field,SaveForm} from './ui';
import {routeHash} from './lib/navigation';

export function ClientHelp({familyId,w,refresh}:{familyId:string;w:Workspace;refresh:()=>Promise<void>}){
 const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
 const [note,setNote]=useRetainedState('client-help:'+familyId,()=>'',v=>!!v,'בקשת עזרה');
 const family=w.families.find(f=>f.id===familyId);
 if(supportClosed(family?.status||'',w.finalReports.filter(r=>r.family_id===familyId)))return <section className="client-help"><h3>המשך פנייה בדוא״ל</h3><p>חלון הפניות במערכת הסתיים, שבעה ימים לאחר סיום התיק ואישור הדוח. להמשך סיוע יש לפנות בדוא״ל למערכת.</p>{typeof w.settings.support_email==='string'?<a href={'mailto:'+w.settings.support_email}>שליחת דוא״ל למערכת</a>:<p>כתובת הדוא״ל טרם הוגדרה בסביבת הבדיקה.</p>}</section>;
 const request=w.familyTasks.find(t=>t.family_id===familyId&&t.request_kind==='help'&&['open','in_progress'].includes(t.status));
 return <details className="client-help"><summary>צריכים עזרה מהנציג?</summary>{request?<p role="status">בקשת העזרה רשומה במעקב של {request.owner_name}. טרם נקבע מועד לחזרה. אפשר לעקוב אחריה ב״בטיפול עבורי״.</p>:<SaveForm protectDraft={false} label="רישום בקשת עזרה" successMessage="הבקשה נרשמה במעקב. לא נשלחה הודעה מחוץ למערכת." save={async()=>{await rpc('rpc_client_request',{p_id:requestId,p_family_id:familyId,p_kind:'help',p_details:note});await refresh();setNote('');setRequestId(crypto.randomUUID());}}><p>כתבו במה נדרשת עזרה בנוגע לתיק, למסמכים או לתיאום השיחה. הבקשה תופיע אצל הנציג במעקב; אין כאן שליחת מייל או הודעה.</p><Field label="במה נוכל לעזור?"><textarea required minLength={3} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></Field></SaveForm>}</details>;
}

export function TaskContext({task,kind,w,refresh,preview=false}:{task:FamilyTask|FollowUp;kind:'familyTask'|'followUp';w:Workspace;refresh:()=>Promise<void>;preview?:boolean}){
 const [requested,setRequested]=useState(false);
 const [requestId]=useState(()=>crypto.randomUUID());
 const doc=w.documents.find(d=>d.id===task.document_id&&d.family_id===task.family_id);
 const correction=w.familyTasks.find(t=>t.request_kind==='correction'&&t.source_id===task.id&&t.source_kind===kind&&['open','in_progress'].includes(t.status));
 return <div className="task-context">{doc?<><a className="task-destination" href={routeHash({page:'families',id:task.family_id,tab:'documents',focus:doc.id})}>פתיחת המסמך: {doc.name}</a><p className="muted">{['pending','approved','signed'].includes(doc.status)?'המסמך כבר צורף. אפשר לעדכן שהפעולה הושלמה; בדיקת המסמך נשארת באחריות הנציג.':'יש לצרף את המסמך לפני סימון המשימה כהושלמה.'}</p></>:task.document_id?<p className="hint">בקשת המסמך אינה זמינה. יש לבקש מהנציג לבדוק את הקישור.</p>:null}
 {!preview&&!supportClosed(w.families.find(f=>f.id===task.family_id)?.status||'',w.finalReports.filter(r=>r.family_id===task.family_id))&&w.profile.role==='client'&&task.owner_role==='client'&&task.visible_to_client&&task.status==='completed'&&(correction||requested?<p role="status" className="hint">בקשת התיקון נרשמה במעקב של הנציג. המשימה נשארת מסומנת כהושלמה עד לבדיקה.</p>:<AsyncButton action={async()=>{await rpc('rpc_client_request',{p_id:requestId,p_details:'סימנתי בטעות שהמשימה הושלמה. נא לבדוק ולתקן.',p_family_id:task.family_id,p_kind:'correction',p_source_kind:kind,p_source_id:task.id,p_expected_revision:task.revision});setRequested(true);await refresh();}}>סימנתי בטעות — בקשת תיקון מהנציג</AsyncButton>)}
 </div>;
}

export function documentTaskReady(task:FamilyTask|FollowUp,w:Workspace){return !task.document_id||w.documents.some(d=>d.id===task.document_id&&d.family_id===task.family_id&&['pending','approved','signed'].includes(d.status));}
