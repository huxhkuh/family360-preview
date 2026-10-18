import {useEffect,useState} from 'react';
import type {FollowUp,Workspace} from '../lib/model';
import {useRetainedState} from '../lib/draft-guard';
import {rpc} from '../lib/backend';
import {Field,SaveForm} from '../ui';
import {dueLabel} from './followup-utils';
export function InlineFollowup({task,w,refresh}:{task:FollowUp;w:Workspace;refresh:()=>Promise<void>}){
 const initial={due_on:task.due_on,owner_role:task.owner_role,visible_to_client:task.visible_to_client};
 const [work,setWork]=useRetainedState('followup-quick:'+task.id,()=>({draft:initial,saved:initial,revision:task.revision}),v=>JSON.stringify(v.draft)!==JSON.stringify(v.saved),task.title);
 const {draft,saved,revision}=work;const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 const [editing,setEditing]=useState(dirty);const [discard,setDiscard]=useState(false);
 useEffect(()=>{if(!dirty)setWork({draft:initial,saved:initial,revision:task.revision});},[task.revision]);
 const privateTopic=task.item_id&&w.meetingItems.some(i=>i.id===task.item_id&&!i.visible_to_client);
 return <div className="inline-followup"><button className="text-button" onClick={()=>setEditing(!editing)} aria-expanded={editing}>עדכון אחראי או מועד · {dueLabel(task.due_on)}</button>{dirty&&<span className="draft-dot">טיוטת עדכון</span>}{editing&&<div className="inline-editor"><SaveForm protectDraft={false} label="שמירת אחראי ומועד" successMessage="האחראי והמועד עודכנו. לא נשלחה הודעה." save={async()=>{
 const result=await rpc<FollowUp>('rpc_save_meeting_followup',{p_id:task.id,p_meeting_id:task.meeting_id,p_expected_revision:revision,p_payload:{title:task.title,details:task.details,item_id:task.item_id,...draft}});
 setWork(prev=>({...prev,saved:draft,revision:result.revision}));await refresh();
 }}><div className="fields"><Field label="אחראי למשימת ההמשך"><select value={draft.owner_role} onChange={e=>setWork({...work,draft:{...draft,owner_role:e.target.value as FollowUp['owner_role'],visible_to_client:e.target.value==='client'||draft.visible_to_client}})}><option value="representative">הנציג המטפל</option>{!privateTopic&&<option value="client">המשפחה</option>}</select></Field><Field label="מועד למשימת ההמשך"><input type="date" required min="2000-01-01" value={draft.due_on} onChange={e=>setWork({...work,draft:{...draft,due_on:e.target.value}})}/></Field></div><label><input type="checkbox" disabled={draft.owner_role==='client'||!!privateTopic} checked={draft.visible_to_client} onChange={e=>setWork({...work,draft:{...draft,visible_to_client:e.target.checked}})}/>הצגת המשימה ללקוח</label>{draft.owner_role==='client'&&!task.visible_to_client&&<p className="hint">העברה למשפחה תשתף גם את כותרת המשימה והפירוט הקיים: {task.details||task.title}. בדקו שאין בהם מידע פנימי לפני השמירה.</p>}{dirty&&<p className="draft-notice">העדכון עדיין טיוטה. אפשר לעבור למסך אחר ולחזור אליו.</p>}</SaveForm>{dirty&&<button className="ghost" onClick={()=>setDiscard(true)}>ביטול עדכון האחראי והמועד</button>}{discard&&<div className="hint"><p>לחזור לפרטים השמורים במשימה?</p><button onClick={()=>{setWork({draft:initial,saved:initial,revision:task.revision});setDiscard(false);}}>כן, ביטול העדכון</button><button className="ghost" onClick={()=>setDiscard(false)}>המשך עריכה</button></div>}</div>}</div>;
}
