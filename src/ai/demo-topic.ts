import type {Workspace} from '../lib/model';
import {topicInput} from './topic-context';
import {topicActionSchema,topicStatusAllowed,type TopicJob,type TopicState,type TopicSuggestion} from './topic-contracts';

const jobs=new Map<string,{job:TopicJob;readyAt:number}>();let serial=0;
export const resetDemoTopics=()=>{jobs.clear();serial=0;};
function suggestion(job:TopicJob):TopicSuggestion{
 const input=job.input,guide=input.sources.find(s=>s.kind==='guide')!;
 if(input.action==='summarize')return {text:'עיקרי ההערות בנושא '+input.topic.title+':\n'+input.notes.trim(),sources:['conversation:notes'],caution:'ניסוח לדוגמה מתוך ההערות שהוזנו; יש לערוך לפני השימוש.'};
 if(input.action==='followup')return {text:input.topic.question,sources:[guide.id],caution:''};
 if(input.action==='missing')return {text:input.topic.needs.map(s=>'• '+s).join('\n'),sources:[guide.id],caution:'בודקים עם המשפחה מה כבר קיים ומה עוד צריך להשלים.'};
 return {text:input.topic.explain,sources:[guide.id],caution:''};
}
export function demoTopic(name:string,a:Record<string,any>,w:Workspace):TopicState{
 if(!['admin','representative'].includes(w.profile.role))throw Error('PERMISSION_DENIED');
 if(typeof a.p_notes!=='string'||a.p_notes.length>5000)throw Error('VALIDATION');
 const action=topicActionSchema.parse(a.p_action),input=topicInput(w,a.p_meeting_id,a.p_topic_key,action,a.p_notes);
 if(a.p_client_wording===true)input.clientWording=true;
 const key=w.profile.id+':'+JSON.stringify(input);let entry=jobs.get(key);
 if(a.p_job_id){const match=[...jobs.values()].find(e=>e.job.id===a.p_job_id);if(!match||match.job.input.meetingId!==input.meetingId||match.job.input.topicKey!==input.topicKey||match.job.input.action!==action)throw Error('PERMISSION_DENIED');entry=match;}
 if(name==='rpc_ai_assist_topic'){
  if(!topicStatusAllowed(input.meetingStatus,action,input.clientWording))throw Error('INVALID_STATE');if(action==='summarize'&&!input.notes.trim())throw Error('VALIDATION');
  if(!entry||JSON.stringify(entry.job.input)!==JSON.stringify(input)){const at=new Date().toISOString();entry={readyAt:Date.now()+650,job:{id:'demo-topic:'+ ++serial,kind:'brief',purpose:'topic_assistance',input,status:'queued',revision:1,result:null,reviews:[],sources:input.sources,error_code:null,created_at:at,updated_at:at,demo:true}};jobs.set(key,entry);}
 }
 if(!entry)return {configured:true,job:null};
 if(entry.job.status==='queued'&&Date.now()>=entry.readyAt){entry.job.result=suggestion(entry.job);entry.job.status='ready';entry.job.revision++;}
 const job=structuredClone(entry.job);if(JSON.stringify(job.input)!==JSON.stringify(input)||!topicStatusAllowed(input.meetingStatus,action,input.clientWording))job.status='stale';
 return {configured:true,job};
}
