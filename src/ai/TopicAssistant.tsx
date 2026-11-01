import {useEffect,useRef,useState} from 'react';
import type {Workspace} from '../lib/model';
import {useRetainedState,useWorkingDrafts} from '../lib/draft-guard';
import {rpc} from '../lib/backend';
import {Icon} from '../icons';
import {AiSources} from './MeetingPreparation';
import {aiMessage} from './DocumentReader';
import {preparationStamp} from './preparation-cache';
import {topicActions,appendTopicSummary,type TopicAction,type TopicJob,type TopicState} from './topic-contracts';
import './topic-ai.css';

type Board={open:boolean;action:TopicAction;states:Partial<Record<TopicAction,TopicState>>};
type Props={w:Workspace;meetingId:string;topicKey:string;notes:string;onAppend:(text:string,action:TopicAction)=>string};
function topicMessage(error:unknown){const code=error instanceof Error?error.message:'';return ({AI_NOT_CONFIGURED:'שירות העזרה טרם חובר בסביבה זו.',AI_STALE:'נתוני הנושא השתנו. אפשר להכין הצעה עדכנית.',AI_OUTPUT_INVALID:'לא התקבלה הצעה שאפשר לבדוק. אפשר לנסות שוב.',AI_UNAVAILABLE:'שירות העזרה אינו זמין כרגע. אפשר להמשיך בשיחה.',AI_RATE_LIMITED:'שירות העזרה עמוס. אפשר לנסות שוב בהמשך.',AI_RETRY_LIMIT:'הכנת ההצעה לא הושלמה. אפשר להמשיך בעזרת המידע שבכרטיס.',INVALID_STATE:'אפשר להכין הצעה בשיחה פעילה.'} as Record<string,string>)[code]||aiMessage(error);}
const isBusy=(job?:TopicJob|null)=>!!job&&['queued','processing'].includes(job.status);
function SuggestionEditor({job,draftKey,notes,onAppend}:{job:TopicJob;draftKey:string;notes:string;onAppend:Props['onAppend']}){
 const result=job.result!;
 const [draft,setDraft]=useRetainedState(draftKey,()=>({text:result.text,base:result.text,appliedTo:'',appliedText:''}),v=>v.text!==v.base,'נוסח ערוך לעזרה בשיחה');
 const [error,setError]=useState('');const applied=draft.appliedText===draft.text&&!!draft.appliedTo;
 const changed=job.input.notes!==notes&&!(applied&&draft.appliedTo===notes),stale=job.status==='stale'||changed;
 const append=()=>{try{const next=onAppend(draft.text,job.input.action);setDraft(v=>({...v,base:v.text,appliedTo:next,appliedText:v.text}));setError('');}catch{setError('אין מספיק מקום בהערות. אפשר לקצר את הנוסח לפני ההוספה.');}};
 return <div className="ai-topic-editor">{stale&&<p className="ai-topic-stale" role="status">ההערות או נתוני הנושא השתנו. יש להכין הצעה מעודכנת.</p>}<label>נוסח לבדיקה ועריכה<textarea value={draft.text} maxLength={1800} rows={6} onChange={e=>setDraft(v=>({...v,text:e.target.value}))}/></label>{result.caution&&<p className="ai-topic-caution">{result.caution}</p>}<AiSources ids={result.sources} sources={job.sources}/><div className="ai-topic-editor-actions"><button className="primary" disabled={stale||applied||!draft.text.trim()} onClick={append}>{applied?'נוסף לטיוטה':'הוספה לטיוטת ההערות'}<Icon name={applied?'check':'arrow'}/></button>{draft.text!==draft.base&&<button className="ghost" onClick={()=>setDraft(v=>({...v,text:v.base}))}>חזרה לנוסח הקודם</button>}</div>{applied&&<p className="ai-topic-applied" role="status">נוסף להערות. שמירת הנושא מתבצעת בכפתור השמירה של השיחה.</p>}{error&&<p role="alert">{error}</p>}</div>;
}
export function TopicAssistant({w,meetingId,topicKey,notes,onAppend}:Props){
 const identity=w.profile.id+':'+meetingId+':'+topicKey;
 const [board,setBoard]=useRetainedState<Board>('ai-topic-board:'+identity,()=>({open:false,action:'simplify',states:{}}));
 const [error,setError]=useState(''),[requesting,setRequesting]=useState(false),current=useRef(identity),sequence=useRef(0),pending=useRef(false),reading=useRef(new Set<TopicAction>());current.current=identity;
 const working=useWorkingDrafts(),action=board.action,state=board.states[action],job=state?.job;
 const draftKey='ai-topic-edit:'+identity+':'+action+':'+(job?.id||'new')+':text';
 const edited=working.pending(draftKey).length>0,material=preparationStamp(w,w.meetings.find(m=>m.id===meetingId)?.family_id||'');
 const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const update=(value:TopicState,selected:TopicAction)=>setBoard(prev=>({...prev,states:{...prev.states,[selected]:value}}));
 useEffect(()=>{sequence.current++;pending.current=false;reading.current.clear();setRequesting(false);setError('');},[identity]);
 const read=async()=>{if(pending.current||reading.current.has(action))return;reading.current.add(action);const token=++sequence.current,captured=identity;try{const value=await rpc<TopicState>('rpc_ai_topic_assistance',{p_meeting_id:meetingId,p_topic_key:topicKey,p_action:action,p_notes:notes,...(job?{p_job_id:job.id}:{})});if(active.current&&current.current===captured&&token===sequence.current){update(value,action);setError('');}}catch(e){if(active.current&&current.current===captured&&token===sequence.current)setError(topicMessage(e));}finally{if(current.current===captured)reading.current.delete(action);}};
 useEffect(()=>{if(board.open)void read();},[board.open,action,identity,material]);
 useEffect(()=>{if(!board.open||!isBusy(job))return;const timer=setInterval(()=>void read(),1000);return()=>clearInterval(timer);},[board.open,job?.id,job?.status,action,identity,notes]);
 const generate=async()=>{const token=++sequence.current,captured=identity;pending.current=true;setRequesting(true);setError('');try{const value=await rpc<TopicState>('rpc_ai_assist_topic',{p_meeting_id:meetingId,p_topic_key:topicKey,p_action:action,p_notes:notes});if(active.current&&current.current===captured&&token===sequence.current)update(value,action);}catch(e){if(active.current&&current.current===captured&&token===sequence.current)setError(topicMessage(e));}finally{if(active.current&&current.current===captured){pending.current=false;setRequesting(false);}}};
 const busy=requesting||isBusy(job),canUse=['admin','representative'].includes(w.profile.role)&&(w.permissions.includes('*')||w.permissions.includes('families.edit'));
 if(!canUse)return null;
 return <details className="ai-topic-assistant" open={board.open} onToggle={e=>setBoard(v=>({...v,open:e.currentTarget.open}))}><summary><Icon name="meetings"/><span>עזרה בנושא הזה<small>ניסוח, בירור וסיכום</small></span><span className="ai-topic-tag">AI</span></summary><div className="ai-topic-body"><div className="ai-topic-actions" role="group" aria-label="סוג העזרה בנושא">{Object.entries(topicActions).map(([key,label])=><button key={key} aria-pressed={action===key} disabled={requesting} onClick={()=>setBoard(v=>({...v,action:key as TopicAction}))}>{label}</button>)}</div><div className="ai-topic-toolbar"><span>{action==='summarize'?'מתוך ההערות שהוזנו בנושא':'מתוך המידע בתיק ומדריך השיחה'}</span><button className="ai-topic-generate" disabled={busy||edited||state?.configured===false||(action==='summarize'&&!notes.trim())} onClick={()=>void generate()}><Icon name="arrow"/>{busy?'מכין הצעה…':job?'עדכון ההצעה':'הכנת הצעה'}</button></div>{!import.meta.env.VITE_LIVE_MODE&&<p className="ai-topic-demo">הדגמת עזרה בשיחה · ללא פנייה לספק AI</p>}{state?.configured===false&&<p role="status">שירות העזרה טרם חובר בסביבה זו.</p>}{edited&&<p className="ai-topic-caution">יש כאן נוסח שערכת. אפשר להוסיף אותו להערות או לחזור לנוסח הקודם לפני הכנת הצעה חדשה.</p>}{job?.status==='stale'&&!job.result&&<p className="ai-topic-stale" role="status">המידע השתנה בזמן הכנת ההצעה. אפשר להכין הצעה עדכנית.</p>}<div className="ai-topic-output" aria-busy={busy}>{job?.result?<SuggestionEditor key={job.id} job={job} draftKey={draftKey} notes={notes} onAppend={onAppend}/>:<div className="ai-topic-empty"><Icon name={action==='summarize'?'report':'meetings'}/><h4>{busy?'מכינים נוסח לנושא שעל השולחן':topicActions[action]}</h4><p role="status">{busy?'אפשר להמשיך לכתוב. ההצעה תופיע כאן.':action==='summarize'&&!notes.trim()?'הזינו הערות בנושא כדי להכין להן סיכום.':'בחרו פעולה והכינו הצעה שאפשר לערוך לפני השימוש.'}</p></div>}</div>{(error||job?.error_code)&&<p className="ai-error" role="alert">{error||topicMessage(new Error(job?.error_code||''))}</p>}</div></details>;
}

export function topicNoteAppender(notes:string,text:string,action:TopicAction){return appendTopicSummary(notes,text,action==='summarize'?'סיכום לנושא':topicActions[action]);}
