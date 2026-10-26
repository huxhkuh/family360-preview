import {z} from 'zod';
import {Context,parse,stateIn} from './context';
import {taskAccess,has} from './auth';
import {uuid,now,requireThat,type Row} from './db';
export async function eligible(c:Context,professionalId:string,service:Row,kind:'analysis'|'execution'){
 const pro=await c.db.required('professionals',professionalId);const profile=await c.db.required('profiles',pro.profile_id);const link=(await c.db.rows('professional_services','professional_id=? AND service_id=?',[pro.id,service.id]))[0];requireThat(pro.active&&profile.active&&profile.role==='professional'&&service.active&&pro[kind+'_enabled']&&link?.[kind+'_enabled'],'INELIGIBLE_PROFESSIONAL',400);return pro;
}
export async function assign(c:Context,fs:Row,professionalId:string,kind:'analysis'|'execution',args:Row={},claimed=false){
 const family=claimed?await c.db.required('families',fs.family_id):await c.staffFamily(fs.family_id,kind+'.send');const service=await c.db.required('services',fs.service_id);const pro=await eligible(c,professionalId,service,kind);
 stateIn(fs,kind==='analysis'?['waiting_analysis']:['client_approved_execution']);
 const id=uuid();const count=(await c.db.rows('counters','key=?',[kind+'_task']))[0];const number=Number(count.value)+1;
 c.statements.push(c.db.statement('UPDATE counters SET value=? WHERE key=?',[number,kind+'_task']));
 let hours=pro[kind+'_sla_overrides']?.[service.key]||pro[kind+'_sla_hours']||service[kind+'_sla_hours']||(kind==='analysis'?72:96);
 const base:Row={id,task_number:(kind==='analysis'?'AN-':'EX-')+String(number).padStart(6,'0'),family_id:family.id,family_service_id:fs.id,service_id:service.id,professional_id:pro.id,representative_id:family.representative_id,status:kind==='analysis'?'assigned':'sent_execution',snapshot:(service.professional_fields||[]).map((f:Row)=>({label:f.label,key:f.key,value:family.answers?.[f.key]??null})),created_at:now(),updated_at:now()};
 if(kind==='execution'){
  const item=(await c.db.rows('meeting_items',"family_service_id=? AND client_decision='progress'",[fs.id],'ORDER BY updated_at DESC LIMIT 1'))[0];requireThat(item,'INVALID_STATE',409);const meeting=await c.db.required('meetings',item.meeting_id);requireThat(meeting.status==='completed','INVALID_STATE',409);
  if(item.urgency==='high')hours=Math.max(1,Math.floor(hours/2));Object.assign(base,{source_meeting_id:meeting.id,source_meeting_item_id:item.id,analysis_task_id:fs.analysis_task_id,client_name:family.contact_name||family.name,client_phone:family.phone,client_email:family.email,client_decision_at:item.updated_at,instructions:item.execution_instructions,approved_actions:item.approved_actions,urgency:item.urgency,contact_window:item.contact_window,representative_note:args.p_rep_note||null});
 }else base.rep_note=args.p_note||null;
 base.due_at=new Date(Date.now()+Number(hours)*3600000).toISOString();c.insert(kind+'_tasks',base);
 c.patch('family_services',fs,{status:base.status,professional_id:pro.id,[kind+'_task_id']:id,sent_at:now()});
 for(const docId of parse(z.array(z.string()).max(100),args.p_document_ids||[])){const doc=await c.db.required('documents',docId);requireThat(doc.family_id===family.id&&['approved','signed'].includes(doc.status));c.insert('task_documents',{id:uuid(),document_id:doc.id,[kind+'_task_id']:id,shared_by:c.actor.profile.id});}
 c.event(family.id,kind==='analysis'?'תחום נשלח לניתוח':'תחום נשלח לביצוע');c.notify(pro.profile_id,family.id,'משימה חדשה ממתינה לטיפול');return base;
}
export const taskOperations=['rpc_send_to_analysis','rpc_assign_analysis','rpc_send_to_execution','rpc_assign_execution','rpc_save_analysis_draft','rpc_submit_analysis','rpc_approve_analysis','rpc_return_analysis','rpc_start_execution','rpc_execution_note','rpc_execution_history','rpc_report_execution_complete','rpc_approve_execution','rpc_return_execution','rpc_close_not_completed','rpc_cancel_execution_send','rpc_reassign_execution'];
export async function tasks(c:Context,name:string,a:Row):Promise<unknown>{
 if(['rpc_send_to_analysis','rpc_assign_analysis','rpc_send_to_execution','rpc_assign_execution'].includes(name)){const fs=await c.db.required('family_services',a.p_family_service_id);return assign(c,fs,a.p_professional_id,name.endsWith('analysis')?'analysis':'execution',a);}
 if(name==='rpc_save_analysis_draft'||name==='rpc_submit_analysis'){
  requireThat(c.actor.profile.role==='professional');const task=await taskAccess(c.db,c.actor,'analysis_tasks',a.p_task_id);stateIn(task,['assigned','in_progress','returned']);
  const p=parse(z.object({current_situation:z.string().max(10000).optional(),result_tone:z.enum(['red','orange','yellow','green']).nullable().optional(),recommendation:z.string().max(10000).optional(),client_summary:z.string().max(5000).optional(),internal_note:z.string().max(10000).optional(),findings:z.array(z.unknown()).max(100).optional(),actions:z.array(z.unknown()).max(100).optional(),financial:z.record(z.string(),z.unknown()).optional(),result_values:z.record(z.string(),z.unknown()).optional(),attachments:z.array(z.unknown()).max(0).optional()}).strict(),a.p_payload);
  const submitted=name==='rpc_submit_analysis';if(submitted)requireThat(p.current_situation?.trim()&&p.recommendation?.trim()&&p.client_summary?.trim()&&p.result_tone,'VALIDATION',400);
  const result=c.patch('analysis_tasks',task,{...p,status:submitted?'submitted':'in_progress',...(submitted?{completed_at:now()}:{})});if(submitted){const fs=await c.db.required('family_services',task.family_service_id);requireThat(fs.analysis_task_id===task.id,'INVALID_STATE',409);c.patch('family_services',fs,{status:'analysis_received',result_tone:p.result_tone});await c.notifyRep(task.family_id,'ניתוח ממתין לאישור');}return result;
 }
 if(name==='rpc_approve_analysis'||name==='rpc_return_analysis'){
  const fs=await c.db.required('family_services',a.p_family_service_id);await c.staffFamily(fs.family_id,'analysis.approve');stateIn(fs,['analysis_received']);const task=await c.db.required('analysis_tasks',fs.analysis_task_id);stateIn(task,['submitted']);const approve=name==='rpc_approve_analysis';
  c.patch('analysis_tasks',task,{status:approve?'approved':'returned',...(!approve?{return_history:[...task.return_history,{reason:parse(z.string().trim().min(3).max(3000),a.p_reason),at:now()}]}:{})});return c.patch('family_services',fs,{status:approve?'approved_analysis':'in_progress'});
 }
 const task=await taskAccess(c.db,c.actor,'execution_tasks',a.p_task_id);const fs=await c.db.required('family_services',task.family_service_id);
 const owner=c.actor.profile.role==='professional'&&task.professional_id===c.actor.professional?.id;
 const approve=async()=>{await c.staffFamily(task.family_id,'execution.approve');};
 const status=(value:string,extra:Row={})=>{c.patch('execution_tasks',task,{status:value,...extra});c.patch('family_services',fs,{status:value==='needs_info'?'execution_needs_info':value});};
 if(name==='rpc_execution_history')return {updates:await c.db.rows('execution_updates','execution_task_id=?',[task.id],'ORDER BY created_at,id'),messages:await c.db.rows('execution_messages','execution_task_id=?',[task.id],'ORDER BY created_at,id')};
 if(name==='rpc_start_execution'){requireThat(owner);stateIn(task,['sent_execution']);status('execution_in_progress',{started_at:now()});return null;}
 if(name==='rpc_execution_note'){
  stateIn(task,['sent_execution','execution_in_progress','waiting_client','needs_info','execution_reported_complete']);const action=parse(z.enum(['message','note','wait','needs_info','resume']),a.p_action);const text=parse(z.string().trim().min(1).max(5000),a.p_text);
  if(action==='message')c.insert('execution_messages',{id:uuid(),execution_task_id:task.id,sender_profile_id:c.actor.profile.id,sender_role:c.actor.profile.role,body:text});else if(action==='note')c.insert('execution_updates',{id:uuid(),execution_task_id:task.id,author_profile_id:c.actor.profile.id,author_name:c.actor.profile.name,kind:'progress',text});else{if(!owner)await approve();stateIn(task,['execution_in_progress','waiting_client','needs_info']);status({wait:'waiting_client',needs_info:'needs_info',resume:'execution_in_progress'}[action],{waiting_reason:text,waiting_follow_up_at:a.p_follow_up||null});}return null;
 }
 if(name==='rpc_report_execution_complete'){
  requireThat(owner);stateIn(task,['execution_in_progress','waiting_client','needs_info']);const p=parse(z.object({outcome:z.string().max(500),outcome_summary:z.string().trim().min(3).max(5000),outcome_result:z.string().max(5000).optional(),outcome_value:z.number().finite().nonnegative().optional().nullable(),outcome_note:z.string().max(5000).optional()}).strict(),{outcome:a.p_outcome,outcome_summary:a.p_summary,outcome_result:a.p_result,outcome_value:a.p_value});status('execution_reported_complete',{...p,reported_at:now()});await c.notifyRep(task.family_id,'ביצוע ממתין לאישור');return null;
 }
 if(name==='rpc_approve_execution'){await approve();stateIn(task,['execution_reported_complete']);status('completed',{completed_at:now()});c.event(task.family_id,'ביצוע אושר');return null;}
 if(name==='rpc_return_execution'){await approve();stateIn(task,['execution_reported_complete']);status('execution_in_progress',{return_history:[...task.return_history,{reason:parse(z.string().trim().min(3).max(3000),a.p_reason),at:now()}]});return null;}
 if(name==='rpc_close_not_completed'){await approve();stateIn(task,['sent_execution','execution_in_progress','waiting_client','needs_info','execution_reported_complete']);status('not_completed',{close_reason:parse(z.string().trim().min(3).max(3000),a.p_reason),completed_at:now()});return null;}
 if(name==='rpc_cancel_execution_send'){await c.staffFamily(task.family_id,'execution.send');stateIn(task,['sent_execution']);c.patch('execution_tasks',task,{status:'cancelled',cancel_reason:parse(z.string().trim().min(3).max(3000),a.p_reason)});c.patch('family_services',fs,{status:'client_approved_execution',execution_task_id:null});return null;}
 if(name==='rpc_reassign_execution'){
  await c.staffFamily(task.family_id,'execution.send');stateIn(task,['sent_execution','execution_in_progress','waiting_client','needs_info']);requireThat(task.professional_id!==a.p_new_professional_id,'VALIDATION',400);const reason=parse(z.string().trim().min(3).max(3000),a.p_reason);c.patch('execution_tasks',task,{status:'reassigned',reassignment_history:[...task.reassignment_history,{at:now(),reason}]});const result=await assign(c,{...fs,status:'client_approved_execution'},a.p_new_professional_id,'execution',{});return result;
 }
}
