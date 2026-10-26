import {z} from 'zod';
import {Context,parse,timestamp,expected,stateIn} from './context';
import {requireThat,uuid,now,type Row} from './db';
import {saveTask} from './families';
import {meetingTopics} from '../../src/meetings/topic-catalog';
export const meetingOperations=['rpc_schedule_meeting','rpc_meeting_action','rpc_manage_meeting','rpc_finish_meeting','rpc_save_meeting_topic','rpc_save_decision_followup'];
export async function meetings(c:Context,name:string,a:Row):Promise<unknown>{
 if(name==='rpc_schedule_meeting'){
  const family=await c.staffFamily(a.p_family_id);const at=parse(timestamp,a.p_scheduled_at);const type=parse(z.enum(['inperson','phone','video','zoom']),a.p_type);const analyses=await c.db.rows('analysis_tasks',"family_id=? AND status='approved'",[family.id]);
  requireThat(!(await c.db.rows('meetings',"family_id=? AND status IN ('scheduled','in_progress')",[family.id])).length,'INVALID_STATE',409);
  const meeting={id:uuid(),family_id:family.id,representative_id:family.representative_id,scheduled_at:at,type,status:'scheduled'};c.insert('meetings',meeting);
  for(const [index,task]of analyses.entries()){
   const fs=await c.db.required('family_services',task.family_service_id);if(fs.analysis_task_id!==task.id||fs.status!=='approved_analysis')continue;const service=await c.db.required('services',task.service_id);
   c.insert('meeting_items',{id:uuid(),meeting_id:meeting.id,family_id:family.id,family_service_id:fs.id,service_id:service.id,analysis_task_id:task.id,sort_order:index,title:service.name,client_summary:task.client_summary,current_situation:task.current_situation,recommendation:task.recommendation,result_tone:task.result_tone,financial:task.financial,actions:task.actions,attachments:task.attachments,visible_to_client:true,client_decision:'undecided'});c.patch('family_services',fs,{status:'waiting_meeting'});
  }
  c.patch('families',family,{status:'meeting_set'});c.event(family.id,'נקבעה פגישה');return meeting;
 }
 const meeting=await c.db.required('meetings',a.p_meeting_id);await c.staffFamily(meeting.family_id);
 if(name==='rpc_finish_meeting'){
  stateIn(meeting,['in_progress']);const items=await c.db.rows('meeting_items','meeting_id=?',[meeting.id]);requireThat(!items.some(i=>i.visible_to_client&&(!i.client_decision||i.client_decision==='undecided')),'UNDECIDED_ITEMS',400);
  for(const item of items){if(!item.family_service_id)continue;const fs=await c.db.required('family_services',item.family_service_id);const status=({progress:'client_approved_execution',thinking:'client_thinking',declined:'client_declined',no_action:'no_execution_needed'} as Row)[item.client_decision];if(status)c.patch('family_services',fs,{status});}
  c.patch('meetings',meeting,{status:'completed',completed_at:now()});const family=await c.db.required('families',meeting.family_id);c.patch('families',family,{status:'meeting_done',meeting_held:true});c.event(family.id,'הפגישה הסתיימה');return null;
 }
 if(name==='rpc_manage_meeting'){
  stateIn(meeting,['scheduled']);expected(meeting.scheduled_at,a.p_expected_scheduled_at);parse(z.enum(['cancel','reschedule']),a.p_action);
  if(a.p_action==='reschedule')return c.patch('meetings',meeting,{scheduled_at:parse(timestamp,a.p_scheduled_at)});
  const result=c.patch('meetings',meeting,{status:'cancelled',cancel_reason:parse(z.string().trim().min(3).max(2000),a.p_reason)});const family=await c.db.required('families',meeting.family_id);c.patch('families',family,{status:'ready_meeting'});return result;
 }
 if(name==='rpc_save_meeting_topic'){
  stateIn(meeting,['in_progress','completed']);requireThat(meetingTopics.some(t=>t.key===a.p_topic_key),'VALIDATION',400);const result=parse(z.enum(['pending','not_relevant','no_action','follow_up']),a.p_result);const note=parse(z.string().max(2000),a.p_note||'');const old=(await c.db.rows('meeting_topic_checks','meeting_id=? AND topic_key=?',[meeting.id,a.p_topic_key]))[0];expected(old?.revision||0,a.p_expected_revision);let followup=old?.followup_id||null;
  if(followup&&result!=='follow_up')stateIn(await c.db.required('meeting_followups',followup),['completed','cancelled']);
  if(a.p_followup){requireThat(!followup&&result==='follow_up','VALIDATION',400);followup=uuid();await saveTask(c,{p_id:followup,p_meeting_id:meeting.id,p_payload:a.p_followup},true);}
  requireThat(result!=='follow_up'||followup,'VALIDATION',400);const row={meeting_id:meeting.id,topic_key:a.p_topic_key,result,note,followup_id:followup,revision:(old?.revision||0)+1,updated_by:c.actor.profile.id,updated_at:now()};return old?c.patch('meeting_topic_checks',old,row):c.insert('meeting_topic_checks',{id:uuid(),...row});
 }
 if(name==='rpc_save_decision_followup'){
  stateIn(meeting,['in_progress']);const item=await c.db.required('meeting_items',a.p_item_id);requireThat(item.meeting_id===meeting.id&&item.family_id===meeting.family_id);requireThat(a.p_decision==='thinking','VALIDATION',400);const other=await c.db.rows('meeting_followups',"item_id=? AND id<>? AND status IN ('open','in_progress')",[item.id,a.p_followup_id]);requireThat(!other.length,'CONFLICT',409);
  c.patch('meeting_items',item,{client_decision:'thinking',decision_note:parse(z.string().max(5000),a.p_note),execution_instructions:parse(z.string().max(5000),a.p_instructions)});return saveTask(c,{p_id:a.p_followup_id,p_meeting_id:meeting.id,p_payload:{...a.p_followup,item_id:item.id},p_expected_revision:a.p_expected_revision},true);
 }
 if(name==='rpc_meeting_action'){
  const action=parse(z.enum(['start','decision','reschedule','cancel','visibility']),a.p_action);const p=a.p_payload||{};
  if(action==='start'){stateIn(meeting,['scheduled']);return c.patch('meetings',meeting,{status:'in_progress',started_at:now()});}
  if(action==='reschedule'||action==='cancel'){stateIn(meeting,['scheduled']);return c.patch('meetings',meeting,action==='reschedule'?{scheduled_at:parse(timestamp,p.scheduled_at)}:{status:'cancelled',cancel_reason:parse(z.string().min(3).max(2000),p.reason)});}
  stateIn(meeting,['in_progress']);const item=await c.db.required('meeting_items',p.item_id);requireThat(item.meeting_id===meeting.id&&item.family_id===meeting.family_id);
  if(action==='visibility')return c.patch('meeting_items',item,{visible_to_client:parse(z.boolean(),p.visible_to_client)});
  return c.patch('meeting_items',item,parse(z.object({client_decision:z.enum(['progress','thinking','declined','no_action','undecided']),decision_note:z.string().max(5000).optional(),execution_instructions:z.string().max(5000).optional(),approved_actions:z.array(z.unknown()).max(100).optional()}),p));
 }
}
