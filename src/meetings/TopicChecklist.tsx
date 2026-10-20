import {useRetainedState} from '../lib/draft-guard';
import {useEffect,useRef,useState} from 'react';
import type {Meeting,Workspace} from '../lib/model';
import {rpc} from '../lib/backend';
import {AsyncButton,Field,SaveForm} from '../ui';
import {dueLabel,followUpStatuses,isOpen} from '../followups/followup-utils';
import {availableMeetingTopics,topicResults,type MeetingTopic,type TopicResult} from './topic-catalog';
import './checklist-guidance.css';

type Check=Workspace['topicChecks'][number];
function TopicEditor({topic,row,w,meeting,refresh,onDirtyChange,done,position,total}:{topic:MeetingTopic;row?:Check;w:Workspace;meeting:Meeting;refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void;done:(advance:boolean,result:TopicResult)=>void;position:number;total:number}){
 const mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const headingRef=useRef<HTMLHeadingElement>(null);
 const [initial]=useState(()=>({result:row?.result||'pending' as TopicResult,note:row?.note||'',title:`בירור בנושא ${topic.title}`,details:'',owner_role:'representative',due_on:'',visible_to_client:false}));
 const [work,setWork]=useRetainedState('checklist:'+meeting.id+':'+topic.key,()=>({draft:initial,saved:initial,savedRow:row,revision:row?.revision||0}),v=>JSON.stringify(v.draft)!==JSON.stringify(v.saved),topic.title);
 const {draft,saved,savedRow,revision}=work;const setDraft=(draft:typeof initial)=>setWork(prev=>({...prev,draft}));
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 useEffect(()=>{if(!dirty&&row&&row.revision>=revision){const latest={...draft,result:row.result,note:row.note};setWork({draft:latest,saved:latest,savedRow:row,revision:row.revision});}},[row?.revision]);
 const task=w.followUps.find(t=>t.id===savedRow?.followup_id);const hasTask=!!savedRow?.followup_id;
 useEffect(()=>{headingRef.current?.focus({preventScroll:true});},[topic.key]);
 useEffect(()=>{onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[dirty]);
 return <section className="card checklist-editor" aria-label="בדיקת נושא"><p className="eyebrow">נושא {position} מתוך {total} · {topic.group} · תיעוד לצוות בלבד</p><h2 ref={headingRef} tabIndex={-1}>{topic.title}</h2><div className="checklist-question"><span>שואלים את המשפחה</span><p className="topic-question">{topic.question}</p></div>{topic.help&&<details className="summary-preview"><summary>מה חשוב לדעת?</summary><p>{topic.help}</p><a href={topic.source} target="_blank" rel="noopener noreferrer">לתקנון באתר הגוף המפעיל</a></details>}
 {meeting.status==='scheduled'?<><p className="hint">אפשר לעיין ברשימה לפני השיחה. כדי לתעד את הבדיקה יש להתחיל את הפגישה.</p><AsyncButton className="primary" action={async()=>{await rpc('rpc_meeting_action',{p_meeting_id:meeting.id,p_action:'start'});await refresh();}}>התחלת פגישה</AsyncButton></>:meeting.status==='cancelled'?<p className="hint">השיחה בוטלה. התיעוד מוצג לעיון בלבד.</p>:<SaveForm protectDraft={false} label="שמירת בדיקת הנושא" submitActions={<div className="checklist-save-actions"><button className="primary" type="submit" name="intent" value="next" disabled={draft.result==='pending'}>שמירה והמשך לבדיקה הבאה</button><button type="submit" name="intent" value="stay">שמירת בדיקת הנושא</button></div>} save={async (_data,intent)=>{
  const result=await rpc<Check>('rpc_save_meeting_topic',{p_meeting_id:meeting.id,p_topic_key:topic.key,p_result:draft.result,p_note:draft.note,p_expected_revision:revision,p_followup:draft.result==='follow_up'&&!hasTask?{title:draft.title,details:draft.details,owner_role:draft.owner_role,due_on:draft.due_on,visible_to_client:draft.visible_to_client}:null});
  setWork(prev=>({...prev,saved:draft,savedRow:result,revision:result.revision}));await refresh();if(!mounted.current)return;done(intent==='next',draft.result);
 }}><Field label="תוצאת הבדיקה"><select value={draft.result} onChange={e=>setDraft({...draft,result:e.target.value as TopicResult})}>{Object.entries(topicResults).map(([key,label])=><option key={key} value={key} disabled={!!task&&isOpen(task)&&key!=='follow_up'}>{label}</option>)}</select></Field>
 <Field label="תיעוד הבדיקה — פנימי לצוות"><textarea maxLength={2000} value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></Field>
 {hasTask&&<div className="hint"><strong>נוצרה משימת המשך בנושא זה</strong>{task?<p>{task.title} · {task.owner_name} · עד {dueLabel(task.due_on)} · {followUpStatuses[task.status]}</p>:<p>המשימה אינה מוצגת ברשימת המעקב שנטענה.</p>}<p>עריכת המשימה וסגירתה נעשות בסיכום השיחה או במסך המעקב. יש לסגור משימה פתוחה לפני שינוי התוצאה ל״אין פעולה״.</p></div>}
 {draft.result==='follow_up'&&!hasTask&&<fieldset><legend>הצעד הבא</legend><p className="muted">המשימה תישמר יחד עם הבדיקה ותופיע במעקב ובסיכום השיחה.</p><Field label="מה צריך לעשות?"><input required minLength={3} maxLength={200} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></Field><Field label="באחריות מי?"><select value={draft.owner_role} onChange={e=>setDraft({...draft,owner_role:e.target.value,visible_to_client:e.target.value==='client'||draft.visible_to_client})}><option value="representative">הנציג המטפל בתיק</option><option value="client">המשפחה</option></select></Field><Field label="עד מתי?"><input type="date" required min="2000-01-01" value={draft.due_on} onChange={e=>setDraft({...draft,due_on:e.target.value})}/></Field><Field label="פירוט למשימת ההמשך"><textarea maxLength={3000} value={draft.details} onChange={e=>setDraft({...draft,details:e.target.value})}/></Field><label className="check"><input type="checkbox" checked={draft.visible_to_client} disabled={draft.owner_role==='client'} onChange={e=>setDraft({...draft,visible_to_client:e.target.checked})}/>הצגת משימת ההמשך ללקוח</label><p className="hint">{draft.visible_to_client?'הלקוח יראה את שם המשימה, הפירוט, האחראי והמועד. תיעוד הבדיקה הפנימי אינו משותף.':'המשימה תהיה פנימית לצוות. אפשר לשתף אותה עם הלקוח.'}</p></fieldset>}
 <p className="muted" role="status">{dirty?'טיוטת הבדיקה זמינה במעבר בין נושאים · טרם נשמרה בתיק':'מוצג התיעוד שנשמר בתיק'}</p>{draft.result==='pending'&&<p className="hint">בחרו תוצאת בדיקה כדי לשמור ולהמשיך לנושא הבא. אפשר לשמור תיעוד חלקי ולחזור אליו בהמשך.</p>}</SaveForm>}
 </section>;
}

export function TopicChecklist({w,meeting,refresh,onDirtyChange,leave,onComplete}:{w:Workspace;meeting:Meeting;refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void;leave:()=>boolean;onComplete?:()=>void}){
 const editorRef=useRef<HTMLDivElement>(null);
 const completeRef=useRef<HTMLHeadingElement>(null);
 const [selected,setSelected]=useRetainedState('checklist-selection:'+meeting.id,()=> '');const [filter,setFilter]=useRetainedState('checklist-filter:'+meeting.id,()=> 'all');const [query,setQuery]=useRetainedState('checklist-search:'+meeting.id,()=> '');const [notice,setNotice]=useState('');
 const meetingTopics=availableMeetingTopics(w.questionnaireV2Enabled);const rows=w.topicChecks.filter(c=>c.meeting_id===meeting.id);const get=(key:string)=>rows.find(c=>c.topic_key===key);
 const checked=meetingTopics.filter(t=>get(t.key)&&get(t.key)?.result!=='pending').length;
 const shown=meetingTopics.filter(t=>(filter==='all'||filter===(get(t.key)?.result||'pending'))&&`${t.title} ${t.group}`.includes(query.trim()));
 const current=meetingTopics.find(t=>t.key===selected);
 const nextPending=meetingTopics.find(t=>!get(t.key)||get(t.key)?.result==='pending');
 const completed=checked===meetingTopics.length;
 const finish=(advance:boolean,result:TopicResult)=>{
  if(!current)return;
  setNotice(`הבדיקה בנושא ${current.title} נשמרה.`);
  if(!advance)return;
  const index=meetingTopics.findIndex(t=>t.key===current.key);
  const following=[...meetingTopics.slice(index+1),...meetingTopics.slice(0,index)];
  const next=following.find(t=>!get(t.key)||get(t.key)?.result==='pending');
  setSelected(next?.key||(result==='pending'?current.key:''));
 };
 useEffect(()=>{if(selected)editorRef.current?.scrollIntoView({block:'start',behavior:'instant'});},[selected]);
 useEffect(()=>{if(completed&&!selected&&notice)completeRef.current?.focus();},[completed,selected,notice]);
 return <section className="guided-checklist" aria-label="רשימת בדיקה לשיחה"><header className="page-title"><div><p className="eyebrow">מפת הנושאים למשפחה</p><h2>עוברים יחד, בלי לפספס</h2><p className="muted">{checked} מתוך {meetingTopics.length} נושאים נבדקו · {meetingTopics.length-checked} עדיין ממתינים לבדיקה</p><progress value={checked} max={meetingTopics.length} aria-label="התקדמות בדיקת הנושאים"/></div>{!current&&nextPending&&meeting.status!=='cancelled'&&<button className="primary" onClick={()=>{if(leave()){setSelected(nextPending.key);setNotice('');}}}>המשך לנושא הבא לבדיקה</button>}</header>
 {notice&&<p role="status" className="success">{notice}</p>}
 {completed&&!current&&<div className="checklist-complete"><h3 ref={completeRef} tabIndex={-1}>כל הנושאים נבדקו</h3><p>כעת עוברים על ההחלטות ועל משימות ההמשך עם המשפחה.</p>{onComplete&&<button className="primary" onClick={()=>{if(leave())onComplete();}}>לסיכום השיחה ומשימות ההמשך</button>}</div>}
 {current&&<div ref={editorRef} className="checklist-current"><button className="ghost" onClick={()=>{if(leave())setSelected('');}}>חזרה לכל הנושאים</button><TopicEditor key={current.key} topic={current} row={get(current.key)} w={w} meeting={meeting} refresh={refresh} onDirtyChange={onDirtyChange} done={finish} position={meetingTopics.indexOf(current)+1} total={meetingTopics.length}/></div>}
 <details key={current?.key||'list'} className="checklist-directory" open={!current}><summary>{current?'בחירת נושא אחר מהרשימה':'כל הנושאים לבדיקה'}</summary><p className="hint">בכל נושא בודקים רלוונטיות ומתעדים את התוצאה. סימון ברשימה אינו אישור זכאות או המלצה מקצועית. בירור שדורש המשך יקבל משימה עם אחראי ומועד.</p>
 <div className="checklist-tools"><Field label="חיפוש נושא לשיחה"><input type="search" value={query} onChange={e=>{if(leave()){setQuery(e.target.value);setSelected('');}}}/></Field><Field label="סינון לפי תוצאת הבדיקה"><select value={filter} onChange={e=>{if(leave()){setFilter(e.target.value);setSelected('');}}}><option value="all">כל הנושאים ({meetingTopics.length})</option>{Object.entries(topicResults).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field></div>
 <div className="checklist-groups">{[...new Set(shown.map(t=>t.group))].map(group=><section key={group}><h3>{group}</h3><div className="checklist-rows">{shown.filter(t=>t.group===group).map(t=><button className={`checklist-topic ${selected===t.key?'active':''}`} key={t.key} aria-current={selected===t.key?'true':undefined} onClick={()=>{if(t.key!==selected&&leave()){setSelected(t.key);setNotice('');}}}><strong>{t.title}</strong><span className={`checklist-result ${get(t.key)?.result||'pending'}`}>{topicResults[get(t.key)?.result||'pending']}</span></button>)}</div></section>)}{!shown.length&&<p role="status">אין נושאים שמתאימים לסינון. אפשר לשנות את החיפוש או להציג את כל הנושאים.</p>}</div></details></section>;
}
