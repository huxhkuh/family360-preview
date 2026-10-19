import {useState} from 'react';
import type {FamilyTask,FollowUp,Workspace} from './lib/model';
import {rpc} from './lib/backend';
import {useRetainedState} from './lib/draft-guard';
import {AsyncButton,Field,SaveForm} from './ui';
import {routeHash} from './lib/navigation';

export function ClientHelp({familyId,w,refresh}:{familyId:string;w:Workspace;refresh:()=>Promise<void>}){
 const [note,setNote]=useRetainedState('client-help:'+familyId,()=>'',v=>!!v,'בקשת עזרה');
 const request=w.familyTasks.find(t=>t.family_id===familyId&&t.request_kind==='help'&&['open','in_progress'].includes(t.status));
 return <details className="client-help"><summary>צריכים עזרה מהנציג?</summary>{request?<p role="status">בקשת העזרה רשומה במעקב של {request.owner_name}. טרם נקבע מועד לחזרה. אפשר לעקוב אחריה ב״בטיפול עבורי״.</p>:<SaveForm protectDraft={false} label="רישום בקשת עזרה בדמו" successMessage="הבקשה נרשמה במעקב בדמו. לא נשלחה הודעה מחוץ למערכת." save={async()=>{await rpc('rpc_client_request',{p_family_id:familyId,p_kind:'help',p_details:note});setNote('');await refresh();}}><p>כתבו במה נדרשת עזרה. הבקשה תופיע אצל הנציג במעקב של הדמו; אין כאן שליחת מייל או הודעה.</p><Field label="במה נוכל לעזור?"><textarea required minLength={3} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></Field></SaveForm>}</details>;
}

export function TaskContext({task,kind,w,refresh,preview=false}:{task:FamilyTask|FollowUp;kind:'familyTask'|'followUp';w:Workspace;refresh:()=>Promise<void>;preview?:boolean}){
 const [requested,setRequested]=useState(false);
 const doc=w.documents.find(d=>d.id===task.document_id&&d.family_id===task.family_id);
 const correction=w.familyTasks.find(t=>t.request_kind==='correction'&&t.source_id===task.id&&t.source_kind===kind&&['open','in_progress'].includes(t.status));
 return <div className="task-context">{doc?<><a className="task-destination" href={routeHash({page:'families',id:task.family_id,tab:'documents',focus:doc.id})}>פתיחת המסמך: {doc.name}</a><p className="muted">{['pending','approved','signed'].includes(doc.status)?'המסמך כבר צורף. אפשר לעדכן שהפעולה הושלמה; בדיקת המסמך נשארת באחריות הנציג.':'יש לצרף את המסמך לפני סימון המשימה כהושלמה.'}</p></>:task.document_id?<p className="hint">בקשת המסמך אינה זמינה. יש לבקש מהנציג לבדוק את הקישור.</p>:null}
 {!preview&&w.profile.role==='client'&&task.owner_role==='client'&&task.visible_to_client&&task.status==='completed'&&(correction||requested?<p role="status" className="hint">בקשת התיקון נרשמה במעקב של הנציג בדמו. המשימה נשארת מסומנת כהושלמה עד לבדיקה.</p>:<AsyncButton action={async()=>{await rpc('rpc_client_request',{p_family_id:task.family_id,p_kind:'correction',p_source_kind:kind,p_source_id:task.id,p_expected_revision:task.revision});setRequested(true);await refresh();}}>סימנתי בטעות — בקשת תיקון מהנציג</AsyncButton>)}
 </div>;
}

export function documentTaskReady(task:FamilyTask|FollowUp,w:Workspace){return !task.document_id||w.documents.some(d=>d.id===task.document_id&&d.family_id===task.family_id&&['pending','approved','signed'].includes(d.status));}
