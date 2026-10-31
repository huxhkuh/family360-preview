import {useEffect,useState} from 'react';
import {rpc} from '../lib/backend';
import {safeMessage,statusLabels} from '../lib/core';
import {useRetainedState} from '../lib/draft-guard';
import {RetainedForm} from '../RetainedForm';
import {Field,textValue} from '../ui';
import type {Task} from '../lib/model';
type RequestRow={id:string;category:string;details:string;status:string;created_at:string;response?:string;revision:number};
const labels:Record<string,string>={document:'מסמך חסר',answer:'הבהרת נתון',instruction:'הבהרת הנחיה'};
export function InformationRequest({task,kind,professional,canRespond,refresh}:{task:Task;kind:string;professional:boolean;canRespond:boolean;refresh:()=>Promise<void>}){
 const [rows,setRows]=useState<RequestRow[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [id,setId]=useRetainedState('info-request-id:'+task.id,()=>crypto.randomUUID());
 const args={p_task_id:task.id,p_kind:kind};
 const load=async()=>{setError('');try{setRows(await rpc<RequestRow[]>('rpc_list_professional_requests',args));}catch(e){setError(safeMessage(e));throw e;}finally{setLoading(false);}};
 useEffect(()=>{let active=true;setLoading(true);rpc<RequestRow[]>('rpc_list_professional_requests',args).then(r=>{if(active)setRows(r);}).catch(e=>{if(active)setError(safeMessage(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[task,kind]);
 const active=['assigned','in_progress','returned','sent_execution','execution_in_progress','waiting_client','needs_info'].includes(task.status);
 return <details className="task-support information-request"><summary>{professional?'חסר לי מידע · בקשות לנציג':'בקשות השלמה מבעל המקצוע'}{rows.length?` (${rows.length})`:''}</summary><div className="task-support-content">
 <p>מבקשים מסמך, נתון או הבהרה מהנציג. הבקשה פנימית; טיוטת העבודה ומצב המשימה נשמרים כפי שהם.</p>
 {loading&&<p role="status">טוענים בקשות קודמות…</p>}{error&&<p role="alert">{error} <button onClick={()=>void load().catch(()=>{})}>ניסיון טעינה נוסף</button></p>}
 {rows.map(row=><article className="info-request-record" key={row.id}><strong>{labels[row.category]} · {statusLabels[row.status]||row.status}</strong><p className="preserve-lines">{row.details}</p><small>{new Date(row.created_at).toLocaleString('he-IL')}</small>{row.response&&<p className="preserve-lines"><strong>מענה הנציג:</strong> {row.response}</p>}{canRespond&&row.status!=='cancelled'&&!row.response&&<RetainedForm draftKey={'info-response:'+row.id} draftLabel={'מענה לבקשת השלמה '+task.task_number} label="שמירת מענה וסימון הבקשה כטופלה" save={async d=>{await rpc('rpc_respond_professional_info',{...args,p_request_id:row.id,p_response:textValue(d,'response'),p_expected_revision:row.revision});await load();await refresh();}}><Field label="המענה לבעל המקצוע"><textarea name="response" required minLength={5} maxLength={2000}/></Field></RetainedForm>}{row.status==='completed'&&<p>הנציג סימן שהבקשה טופלה. בדקו שהמידע הנדרש זמין לפני המשך העבודה.</p>}</article>)}
 {!loading&&!error&&!rows.length&&<p>עדיין לא נשלחו בקשות השלמה למשימה הזו.</p>}
 {professional&&active&&<RetainedForm draftKey={'info-request:'+task.id} draftLabel={'בקשת השלמה '+task.task_number} resetAfterSave label="שליחת בקשת השלמה לנציג" successMessage="בקשת ההשלמה נשמרה במעקב של הנציג." save={async d=>{setId(id);await rpc('rpc_request_professional_info',{...args,p_id:id,p_category:textValue(d,'category'),p_details:textValue(d,'details')});await load();await refresh();setId(crypto.randomUUID());}}>
 <Field label="מה חסר להמשך העבודה?"><select name="category" required><option value="">בחרו סוג השלמה</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
 <Field label="מה צריך להשלים ולשם מה?"><textarea name="details" required minLength={5} maxLength={2000} rows={3}/></Field>
 </RetainedForm>}
 </div></details>;
}
