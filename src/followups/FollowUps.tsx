import {useEffect,useRef,useState} from 'react';
import type {FollowUp,Workspace} from '../lib/model';
import {rpc} from '../lib/backend';
import {AsyncButton,Empty,Field,SaveForm} from '../ui';
import {deadline,dueLabel,followUpStatuses,isOpen,orderedFollowUps} from './followup-utils';

function FollowUpEditor({task,meetingId,w,refresh,done,onDirtyChange}:{task?:FollowUp;meetingId:string;w:Workspace;refresh:()=>Promise<void>;done:(message?:string)=>void;onDirtyChange:(dirty:boolean)=>void}){
 const [id]=useState(()=>task?.id||crypto.randomUUID());
 const [draft,setDraft]=useState(()=>({title:task?.title||'',details:task?.details||'',owner_role:task?.owner_role||'representative',due_on:task?.due_on||'',visible_to_client:task?.visible_to_client??false,item_id:task?.item_id||''}));
 const [initial]=useState(()=>JSON.stringify(draft));const dirty=JSON.stringify(draft)!==initial;
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[dirty]);
 const topics=w.meetingItems.filter(i=>i.meeting_id===meetingId);
 const chosen=topics.find(i=>i.id===draft.item_id);
 return <section className="followup-editor"><h3>{task?'עדכון משימת המשך':'משימת המשך חדשה'}</h3><p className="muted">כתבו פעולה שאפשר להשלים, בחרו מי אחראי וקבעו עד מתי. שינוי התפקיד מעביר את האחריות למשפחה או לנציג המטפל בתיק.</p>
 <SaveForm protectDraft={false} label="שמירת משימת המשך" save={async()=>{
  await rpc('rpc_save_meeting_followup',{p_id:id,p_meeting_id:meetingId,p_expected_revision:task?.revision??null,p_payload:{...draft,item_id:draft.item_id||null}});
  await refresh();done(`${task?'עודכנה':'נוצרה'} משימת המשך: ${draft.title}.`);
 }}><Field label="מה צריך לעשות?"><input required minLength={3} maxLength={200} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="למשל: לתאם שיחת מעקב לגבי החסכונות"/></Field>
 <div className="fields"><Field label="באחריות מי?"><select value={draft.owner_role} onChange={e=>setDraft({...draft,owner_role:e.target.value as FollowUp['owner_role'],visible_to_client:e.target.value==='client'?true:draft.visible_to_client,item_id:e.target.value==='client'&&chosen&&!chosen.visible_to_client?'':draft.item_id})}><option value="representative">הנציג המטפל בתיק</option><option value="client">המשפחה</option></select></Field><Field label="עד מתי?"><input type="date" required min="2000-01-01" value={draft.due_on} onChange={e=>setDraft({...draft,due_on:e.target.value})}/></Field></div>
 <Field label="נושא מהשיחה"><select value={draft.item_id} onChange={e=>{const item=topics.find(i=>i.id===e.target.value);setDraft({...draft,item_id:e.target.value,visible_to_client:item&&!item.visible_to_client?false:draft.visible_to_client});}}><option value="">משימה כללית לשיחה</option>{topics.filter(i=>draft.owner_role!=='client'||i.visible_to_client).map(i=><option key={i.id} value={i.id}>{i.title}{!i.visible_to_client?' — פנימי':''}</option>)}</select></Field>
 <Field label="פירוט הפעולה"><textarea maxLength={3000} value={draft.details} onChange={e=>setDraft({...draft,details:e.target.value})}/></Field>
 <label className="followup-share"><input type="checkbox" checked={draft.visible_to_client} disabled={draft.owner_role==='client'||!!chosen&&!chosen.visible_to_client} onChange={e=>setDraft({...draft,visible_to_client:e.target.checked})}/>הצגת המשימה ללקוח</label><p className="hint">{draft.visible_to_client?'הלקוח יראה את הפעולה, הפירוט, האחראי, המועד והמצב. אין להזין כאן הערות פנימיות.':'המשימה והפירוט שלה יוצגו לצוות המורשה בלבד.'}</p>
 <p className="muted" role="status">{dirty?'יש שינויים שלא נשמרו':'ממלאים ושומרים כדי שהמשימה תופיע במעקב'}</p></SaveForm>
 <button className="ghost" onClick={()=>{if(!dirty||window.confirm('לסגור בלי לשמור את השינויים במשימה?'))done();}}>סגירת העריכה</button></section>;
}

export function FollowUps({w,refresh,meetingId,familyId,onDirtyChange,leave,preview=false,openFamily,activeFilter,onFilter}:{w:Workspace;refresh:()=>Promise<void>;meetingId?:string;familyId?:string;onDirtyChange:(dirty:boolean)=>void;leave:()=>boolean;preview?:boolean;openFamily?:(id:string)=>void;activeFilter?:string;onFilter?:(value:string)=>void}){
 const staff=['admin','representative'].includes(w.profile.role);const edit=staff&&(w.permissions.includes('*')||w.permissions.includes('families.edit'))&&!preview;
 const noticeRef=useRef<HTMLParagraphElement>(null);
 const [editing,setEditing]=useState<FollowUp|'new'|null>(null);const [localFilter,setLocalFilter]=useState('open');const filter=activeFilter||localFilter;const setFilter=(value:string)=>{setLocalFilter(value);onFilter?.(value);};const [notice,setNotice]=useState('');
 useEffect(()=>{if(notice)noticeRef.current?.focus();},[notice]);
 const rows=orderedFollowUps(w.followUps.filter(t=>(!meetingId||t.meeting_id===meetingId)&&(!familyId||t.family_id===familyId)&&(!(preview||!staff)||t.visible_to_client&&(t.item_id===null||w.meetingItems.some(i=>i.id===t.item_id&&i.visible_to_client)))));
 const shown=rows.filter(t=>filter==='all'||(filter==='closed'?!isOpen(t):filter==='late'?deadline(t)==='באיחור':isOpen(t)));
 const targetMeeting=editing&&editing!=='new'?editing.meeting_id:meetingId;
 const meeting=w.meetings.find(m=>m.id===meetingId);
 const canAdd=edit&&meeting&&['in_progress','completed'].includes(meeting.status);
 if(!w.followUpsEnabled)return <p className="hint">משימות ההמשך יהיו זמינות לאחר עדכון המערכת בשרת.</p>;
 return <section className="followups" aria-label={preview?'משימות המשך גלויות ללקוח':'משימות המשך ומועדים'}><div className="section-heading"><div><p className="eyebrow">אחריות ומועדים</p><h2>{preview?'הצעדים הבאים שלכם':'משימות המשך ומועדים'}</h2></div>{canAdd&&!editing&&<button className="primary" onClick={()=>{if(leave()){setEditing('new');setNotice('');}}}>הוספת משימת המשך</button>}</div>
 <p className="muted">{preview||!staff?'כאן רואים מה צריך לעשות, מי מטפל ועד מתי. אפשר לעדכן את מצב המשימות שבאחריותכם.':'משימות תיאום ומעקב מהשיחות. האחריות לנציג מתייחסת לנציג שמטפל בתיק כעת. ביצוע מקצועי ממשיך דרך תחומי הטיפול.'}</p>
 {w.followUpsTruncated&&<p role="status" className="hint">מוצגות 1,000 המשימות הראשונות לפי מצב ומועד. הרשימה אינה מלאה.</p>}
 {editing&&targetMeeting&&<FollowUpEditor key={editing==='new'?'new':editing.id} task={editing==='new'?undefined:editing} meetingId={targetMeeting} w={w} refresh={refresh} onDirtyChange={onDirtyChange} done={message=>{setEditing(null);setNotice(message||'');if(message)setFilter('all');}}/>}
 <nav className="tabs" aria-label="סינון משימות המשך">{[['open','פתוחות'],['late','באיחור'],['closed','הושלמו ובוטלו'],['all','הכול']].map(([key,label])=><button key={key} aria-pressed={filter===key} className={filter===key?'selected':'ghost'} onClick={()=>setFilter(key)}>{label}{key==='open'?` (${rows.filter(isOpen).length})`:''}</button>)}</nav>
 {notice&&<p ref={noticeRef} tabIndex={-1} role="status" className="success">{notice}</p>}
 {!shown.length&&<Empty>{filter==='open'?'אין משימות המשך פתוחות ברשימה זו.':filter==='late'?'אין משימות באיחור ברשימה זו.':'אין משימות שמתאימות לסינון.'}</Empty>}
 <div className="followup-list">{shown.map(t=>{const allowed=!preview&&(edit||!staff&&t.owner_role==='client')&&w.meetings.some(m=>m.id===t.meeting_id&&['completed','in_progress'].includes(m.status));return <article className={`followup-row ${deadline(t)==='באיחור'?'overdue':''}`} key={t.id}><div className="section-heading"><h3>{t.title}</h3><span className={`badge ${t.status}`}>{followUpStatuses[t.status]}</span></div>{!meetingId&&<p className="muted">{openFamily?<button className="text-button" onClick={()=>openFamily(t.family_id)}>{w.families.find(f=>f.id===t.family_id)?.name||'לתיק המשפחה'}</button>:w.families.find(f=>f.id===t.family_id)?.name} · {t.item_id?w.meetingItems.find(i=>i.id===t.item_id)?.title:'מעקב מהשיחה'}</p>}
 {t.details&&<p className="followup-details">{t.details}</p>}<dl className="followup-meta"><div><dt>באחריות</dt><dd>{t.owner_name} · {t.owner_role==='client'?'המשפחה':'נציג'}</dd></div><div><dt>עד לתאריך</dt><dd><time dateTime={t.due_on}>{dueLabel(t.due_on)}</time>{deadline(t)&&<span className="deadline">{deadline(t)}</span>}</dd></div></dl>
 {staff&&!preview&&<p className="visibility-label">{t.visible_to_client?'גלוי ללקוח':'פנימי — לצוות בלבד'}</p>}
 {allowed&&!editing&&<div className="followup-actions">{edit&&isOpen(t)&&<button onClick={()=>{if(leave()){setEditing(t);setNotice('');}}}>עריכת פרטים ומועד</button>}{(isOpen(t)?(['in_progress','completed',...(edit?['cancelled']:[])] as const):edit?['open']:[]).filter(status=>status!==t.status).map(status=><AsyncButton key={status} action={async()=>{if(!leave())return;await rpc('rpc_set_followup_status',{p_id:t.id,p_status:status,p_expected_revision:t.revision});await refresh();setNotice('מצב המשימה עודכן.');}}>{({in_progress:'התחלת טיפול',completed:'סימון כהושלמה',cancelled:'ביטול משימה',open:'פתיחה מחדש'} as Record<string,string>)[status]}</AsyncButton>)}</div>}
 </article>;})}</div></section>;
}
