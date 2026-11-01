import {useEffect,useRef,useState} from 'react';
import {rpc} from '../lib/backend';
import {useRetainedState} from '../lib/draft-guard';
import type {TopicJob,TopicState} from '../ai/topic-contracts';
import {Icon} from '../icons';

export function SummaryNoteWording({meetingId,topicKey,notes,onUse}:{meetingId:string;topicKey:string;notes:string;onUse:(text:string)=>void}){
 const [work,setWork]=useRetainedState<{job:TopicJob|null;notes:string}>('summary-wording:'+meetingId+':'+topicKey,()=>({job:null,notes:''}));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const waiting=!!work.job&&['queued','processing'].includes(work.job.status),changed=work.notes!==notes;
 const args=(text:string)=>({p_meeting_id:meetingId,p_topic_key:topicKey,p_action:'summarize',p_notes:text,p_client_wording:true});
 useEffect(()=>{if(!waiting)return;let reading=false;const id=setInterval(async()=>{if(reading)return;reading=true;try{const next=await rpc<TopicState>('rpc_ai_topic_assistance',{...args(work.notes),p_job_id:work.job!.id});if(active.current)setWork(prev=>({...prev,job:next.job}));}catch{if(active.current)setError('לא ניתן לטעון כרגע את הצעת הנוסח.');}finally{reading=false;}},1200);return()=>clearInterval(id);},[waiting,work.job?.id,work.notes]);
 const generate=async()=>{setBusy(true);setError('');const input=notes;try{const next=await rpc<TopicState>('rpc_ai_assist_topic',args(input));if(active.current)setWork({job:next.job,notes:input});}catch(e){if(active.current)setError(e instanceof Error&&e.message==='AI_NOT_CONFIGURED'?'שירות הניסוח טרם חובר. אפשר לערוך את הטקסט ישירות.':'לא הושלמה הכנת הנוסח. אפשר להמשיך בעריכה.');}finally{if(active.current)setBusy(false);}};
 return <div className="summary-wording"><button className="ghost" disabled={busy||waiting||!notes.trim()} onClick={()=>void generate()}><Icon name="meetings"/>{busy||waiting?'מכין נוסח…':'ניסוח קצר למשפחה'}</button>{!import.meta.env.VITE_LIVE_MODE&&<small>נוסח להדגמה</small>}{work.job?.result&&<div className="summary-wording-proposal"><p>{work.job.result.text}</p>{(changed||work.job.status==='stale')&&<small>הטקסט השתנה מאז הבקשה. יש להכין הצעה עדכנית.</small>}<button className="ghost" disabled={changed||work.job.status!=='ready'} onClick={()=>onUse(work.job!.result!.text)}>שימוש בנוסח המוצע</button></div>}{(error||work.job?.error_code)&&<p role="status">{error||'ההצעה לא הושלמה. הטקסט המקורי נשאר בעריכה.'}</p>}</div>;
}
