import {TaskSupport,RecordFocus} from '../workspace/TaskSurface';
import {readRoute} from '../lib/navigation';
import {TaskContext,documentTaskReady} from '../ClientRequests';
import {InlineFollowup} from './InlineFollowup';
import {useRetainedState,useWorkingDrafts} from '../lib/draft-guard';
import {useEffect,useRef,useState} from 'react';
import type {FollowUp,Workspace} from '../lib/model';
import {rpc} from '../lib/backend';
import {AsyncButton,Empty,Field,SaveForm} from '../ui';
import {deadline,dueLabel,followUpStatuses,isOpen,orderedFollowUps} from './followup-utils';

function FollowUpEditor({task,meetingId,w,refresh,done,onDirtyChange}:{task?:FollowUp;meetingId:string;w:Workspace;refresh:()=>Promise<void>;done:(message?:string)=>void;onDirtyChange:(dirty:boolean)=>void}){
 const store=useWorkingDrafts();
 const [work,setWork]=useRetainedState('followup-editor:'+meetingId+':'+(task?.id||'new'),()=>{const draft={title:task?.title||'',details:task?.details||'',owner_role:task?.owner_role||'representative',due_on:task?.due_on||'',visible_to_client:task?.visible_to_client??false,document_id:task?.document_id||'',item_id:task?.item_id||''};return {id:task?.id||crypto.randomUUID(),draft,saved:draft,revision:task?.revision??null};},v=>JSON.stringify(v.draft)!==JSON.stringify(v.saved),task?.title||'משימת המשך חדשה');
 const {id,draft,revision}=work;const setDraft=(draft:typeof work.draft)=>setWork(prev=>({...prev,draft}));const dirty=JSON.stringify(draft)!==JSON.stringify(work.saved);
 useEffect(()=>{if(task&&!dirty){const latest={title:task.title,details:task.details,owner_role:task.owner_role,due_on:task.due_on,visible_to_client:task.visible_to_client,document_id:task.document_id||'',item_id:task.item_id||''};setWork({id:task.id,revision:task.revision,draft:latest,saved:latest});}},[task?.revision]);
 useEffect(()=>{onDirtyChange(false);},[onDirtyChange]);
 const topics=w.meetingItems.filter(i=>i.meeting_id===meetingId);
 const chosen=topics.find(i=>i.id===draft.item_id);
 return <section className="followup-editor"><h3>{task?'עדכון משימת המשך':'משימת המשך חדשה'}</h3><p className="muted">כתבו פעולה שאפשר להשלים, בחרו מי אחראי וקבעו עד מתי. שינוי התפקיד מעביר את האחריות למשפחה או לנציג המטפל בתיק.</p>
 <SaveForm protectDraft={false} label="שמירת משימת המשך" save={async()=>{
  const result=await rpc<FollowUp>('rpc_save_meeting_followup',{p_id:id,p_meeting_id:meetingId,p_expected_revision:revision,p_payload:{...draft,item_id:draft.item_id||null}});
  setWork(prev=>({...prev,saved:draft,revision:result.revision}));await refresh();if(!task)store.remove('followup-editor:'+meetingId+':new');done(`${task?'עודכנה':'נוצרה'} משימת המשך: ${draft.title}.`);
 }}><Field label="מה צריך לעשות?"><input required minLength={3} maxLength={200} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="למשל: לתאם שיחת מעקב לגבי החסכונות"/></Field>
 <div className="fields"><Field label="באחריות מי?"><select value={draft.owner_role} onChange={e=>setDraft({...draft,owner_role:e.target.value as FollowUp['owner_role'],visible_to_client:e.target.value==='client'?true:draft.visible_to_client,item_id:e.target.value==='client'&&chosen&&!chosen.visible_to_client?'':draft.item_id})}><option value="representative">הנציג המטפל בתיק</option><option value="client">המשפחה</option></select></Field><Field label="עד מתי?"><input type="date" required min="2000-01-01" value={draft.due_on} onChange={e=>setDraft({...draft,due_on:e.target.value})}/></Field></div>
 <Field label="נושא מהשיחה"><select value={draft.item_id} onChange={e=>{const item=topics.find(i=>i.id===e.target.value);setDraft({...draft,item_id:e.target.value,visible_to_client:item&&!item.visible_to_client?false:draft.visible_to_client});}}><option value="">משימה כללית לשיחה</option>{topics.filter(i=>draft.owner_role!=='client'||i.visible_to_client).map(i=><option key={i.id} value={i.id}>{i.title}{!i.visible_to_client?' — פנימי':''}</option>)}</select></Field>
 <Field label="בקשת מסמך קשורה"><select value={draft.document_id} onChange={e=>setDraft({...draft,document_id:e.target.value})}><option value="">ללא קישור למסמך</option>{w.documents.filter(d=>d.family_id===w.meetings.find(m=>m.id===meetingId)?.family_id).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></Field><Field label="פירוט הפעולה"><textarea maxLength={3000} value={draft.details} onChange={e=>setDraft({...draft,details:e.target.value})}/></Field>
 <label className="followup-share"><input type="checkbox" checked={draft.visible_to_client} disabled={draft.owner_role==='client'||!!chosen&&!chosen.visible_to_client} onChange={e=>setDraft({...draft,visible_to_client:e.target.checked})}/>הצגת המשימה ללקוח</label><p className="hint">{draft.visible_to_client?'הלקוח יראה את הפעולה, הפירוט, האחראי, המועד והמצב. אין להזין כאן הערות פנימיות.':'המשימה והפירוט שלה יוצגו לצוות המורשה בלבד.'}</p>
 <p className="muted" role="status">{dirty?'טיוטת המשימה זמינה גם לאחר סגירת העריכה או מעבר מסך':'ממלאים ושומרים כדי שהמשימה תופיע במעקב'}</p></SaveForm>
 <button className="ghost" onClick={()=>{done();}}>סגירת העריכה</button></section>;
}

export function FollowUps({w,refresh,meetingId,familyId,onDirtyChange,leave,preview=false,openFamily,activeFilter,onFilter}:{w:Workspace;refresh:()=>Promise<void>;meetingId?:string;familyId?:string;onDirtyChange:(dirty:boolean)=>void;leave:()=>boolean;preview?:boolean;openFamily?:(id:string)=>void;activeFilter?:string;onFilter?:(value:string)=>void}){
 const staff=['admin','representative'].includes(w.profile.role);const edit=staff&&(w.permissions.includes('*')||w.permissions.includes('families.edit'))&&!preview;
 const noticeRef=useRef<HTMLParagraphElement>(null);
 const [editing,setEditing]=useRetainedState<FollowUp|'new'|null>('followup-open:'+(meetingId||familyId||'all')+':'+preview,()=>null);const [localFilter,setLocalFilter]=useRetainedState('followup-filter:'+(meetingId||familyId||'all')+':'+preview,()=> 'open');const filter=activeFilter||localFilter;const setFilter=(value:string)=>{setLocalFilter(value);onFilter?.(value);};const [notice,setNotice]=useState('');
 useEffect(()=>{if(notice)noticeRef.current?.focus();},[notice]);
 const focused=readRoute(location.hash).focus;useEffect(()=>{if(focused&&w.followUps.some(t=>t.id===focused&&!['open','in_progress'].includes(t.status)))setFilter('all');},[focused]);
 const rows=orderedFollowUps(w.followUps.filter(t=>(!meetingId||t.meeting_id===meetingId)&&(!familyId||t.family_id===familyId)&&(!(preview||!staff)||t.visible_to_client&&(t.item_id===null||w.meetingItems.some(i=>i.id===t.item_id&&i.visible_to_client)))));
 const focusHere=rows.some(t=>t.id===focused);
 const shown=rows.filter(t=>t.id===focused||filter==='all'||(filter==='closed'?!isOpen(t):filter==='late'?deadline(t)==='באיחור':isOpen(t)));
 const targetMeeting=editing&&editing!=='new'?editing.meeting_id:meetingId;
 const meeting=w.meetings.find(m=>m.id===meetingId);
 const canAdd=edit&&meeting&&['in_progress','completed'].includes(meeting.status);
 if(!w.followUpsEnabled)return <p className="hint">משימות ההמשך יהיו זמינות לאחר עדכון המערכת בשרת.</p>;
 const tools=<TaskSupport active={focusHere} title="רשימה וסינון משימות המשך"><div className="section-heading"><div><p className="eyebrow">אחריות ומועדים</p><h2>{preview?'הצעדים הבאים שלכם':'משימות המשך ומועדים'}</h2></div>{canAdd&&!editing&&<button className="primary" onClick={()=>{if(leave()){setEditing('new');setNotice('');}}}>הוספת משימת המשך</button>}</div>
 <p className="muted">{preview||!staff?'כאן רואים מה צריך לעשות, מי מטפל ועד מתי. אפשר לעדכן את מצב המשימות שבאחריותכם.':'משימות תיאום ומעקב מהשיחות. האחריות לנציג מתייחסת לנציג שמטפל בתיק כעת. ביצוע מקצועי ממשיך דרך תחומי הטיפול.'}</p><nav className="tabs" aria-label="סינון משימות המשך">{[['open','פתוחות'],['late','באיחור'],['closed','הושלמו ובוטלו'],['all','הכול']].map(([key,label])=><button key={key} aria-pressed={filter===key} className={filter===key?'selected':'ghost'} onClick={()=>setFilter(key)}>{label}{key==='open'?` (${rows.filter(isOpen).length})`:''}</button>)}</nav></TaskSupport>;
 return <section className="followups" aria-label={preview?'משימות המשך גלויות ללקוח':'משימות המשך ומועדים'}>{!focusHere&&tools}
 {w.followUpsTruncated&&<p role="status" className="hint">מוצגות 1,000 המשימות הראשונות לפי מצב ומועד. הרשימה אינה מלאה.</p>}
 {editing&&targetMeeting&&<FollowUpEditor key={editing==='new'?'new':editing.id} task={editing==='new'?undefined:w.followUps.find(t=>t.id===editing.id)||editing} meetingId={targetMeeting} w={w} refresh={refresh} onDirtyChange={onDirtyChange} done={message=>{setEditing(null);setNotice(message||'');if(message)setFilter('all');}}/>}

 {notice&&<p ref={noticeRef} tabIndex={-1} role="status" className="success">{notice}</p>}
 {!shown.length&&<Empty>{filter==='open'?'אין משימות המשך פתוחות ברשימה זו.':filter==='late'?'אין משימות באיחור ברשימה זו.':'אין משימות שמתאימות לסינון.'}</Empty>}
 <div className="followup-list"><RecordFocus focus={focusHere?focused:undefined} title="יתר משימות ההמשך">{shown.map(t=>{const allowed=!preview&&(edit||!staff&&t.owner_role==='client')&&w.meetings.some(m=>m.id===t.meeting_id&&['completed','in_progress'].includes(m.status));return <article className={`followup-row ${deadline(t)==='באיחור'?'overdue':''}`} key={t.id} data-record-id={t.id} tabIndex={-1}><div className="section-heading"><h3>{t.title}</h3><span className={`badge ${t.status}`}>{followUpStatuses[t.status]}</span></div>{!meetingId&&<p className="muted">{openFamily?<button className="text-button" onClick={()=>openFamily(t.family_id)}>{w.families.find(f=>f.id===t.family_id)?.name||'לתיק המשפחה'}</button>:w.families.find(f=>f.id===t.family_id)?.name} · {t.item_id?w.meetingItems.find(i=>i.id===t.item_id)?.title:'מעקב מהשיחה'}</p>}
 {t.details&&<p className="followup-details">{t.details}</p>}<dl className="followup-meta"><div><dt>באחריות</dt><dd>{t.owner_name} · {t.owner_role==='client'?'המשפחה':'נציג'}</dd></div><div><dt>עד לתאריך</dt><dd><time dateTime={t.due_on}>{dueLabel(t.due_on)}</time>{deadline(t)&&<span className="deadline">{deadline(t)}</span>}</dd></div></dl>
 <TaskContext task={t} kind="followUp" w={w} refresh={refresh} preview={preview}/>{staff&&!preview&&<p className="visibility-label">{t.visible_to_client?'גלוי ללקוח':'פנימי — לצוות בלבד'}</p>}
 {edit&&allowed&&!editing&&isOpen(t)&&<InlineFollowup key={t.id} task={t} w={w} refresh={refresh}/>}
 {allowed&&!editing&&<div className="followup-actions">{edit&&isOpen(t)&&<button onClick={()=>{if(leave()){setEditing(t);setNotice('');}}}>עריכת פרטים ומועד</button>}{(isOpen(t)?(['in_progress','completed',...(edit?['cancelled']:[])] as const):edit?['open']:[]).filter(status=>status!==t.status).map(status=><AsyncButton className={status==='completed'?'primary':''} key={status} disabled={status==='completed'&&!documentTaskReady(t,w)} action={async()=>{if(!leave())return;await rpc('rpc_set_followup_status',{p_id:t.id,p_status:status,p_expected_revision:t.revision});await refresh();setNotice('מצב המשימה עודכן.');}}>{({in_progress:'התחלת טיפול',completed:'סימון כהושלמה',cancelled:'ביטול משימה',open:'פתיחה מחדש'} as Record<string,string>)[status]}</AsyncButton>)}</div>}
 </article>;})}</RecordFocus></div>{focusHere&&tools}</section>;
}
