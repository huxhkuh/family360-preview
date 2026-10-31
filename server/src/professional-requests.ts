import {z} from 'zod';
import {Context,idSchema,expected,parse,stateIn} from './context';
import {taskAccess} from './auth';
import {now,uuid,requireThat,type Row} from './db';
export const requestOperations=['rpc_respond_professional_info','rpc_request_professional_info','rpc_list_professional_requests'];
export async function professionalRequests(c:Context,name:string,a:Row){
 const kind=parse(z.enum(['analysis','execution']),a.p_kind);
 const task=await taskAccess(c.db,c.actor,kind==='analysis'?'analysis_tasks':'execution_tasks',parse(idSchema,a.p_task_id));
 if(name==='rpc_list_professional_requests')return (await c.db.statement('SELECT r.id,r.category,r.details,r.created_at,r.response,t.status,t.revision FROM professional_requests r JOIN family_tasks t ON t.id=r.representative_task_id WHERE r.task_kind=? AND r.task_id=? ORDER BY r.created_at DESC,r.id',[kind,task.id]).all<Row>()).results;
 if(name==='rpc_respond_professional_info'){
  await c.staffFamily(task.family_id);
  const request=await c.db.required('professional_requests',parse(z.uuid(),a.p_request_id));requireThat(request.task_id===task.id&&request.task_kind===kind);
  const response=parse(z.string().trim().min(5).max(2000),a.p_response),work=await c.db.required('family_tasks',request.representative_task_id);
  if(work.status==='completed'&&request.response===response)return {id:request.id};
  expected(work.revision,a.p_expected_revision);stateIn(work,['open','in_progress','completed']);
  c.patch('professional_requests',request,{response});c.patch('family_tasks',work,{status:'completed',revision:work.revision+1,updated_by:c.actor.profile.id});
  const pro=await c.db.required('professionals',request.professional_id);c.notify(pro.profile_id,task.family_id,`מענה לבקשת ההשלמה במשימה ${task.task_number}`);return {id:request.id};
 }
 requireThat(c.actor.profile.role==='professional');
 const id=parse(z.uuid(),a.p_id),category=parse(z.enum(['document','answer','instruction']),a.p_category),details=parse(z.string().trim().min(5).max(2000),a.p_details);
 const old=await c.db.one('professional_requests',id);
 if(old){requireThat(old.task_id===task.id&&old.task_kind===kind&&old.professional_id===c.actor.professional?.id&&old.category===category&&old.details===details,'CONFLICT',409);return {id};}
 stateIn(task,kind==='analysis'?['assigned','in_progress','returned']:['sent_execution','execution_in_progress','waiting_client','needs_info']);
 const service=await c.db.required('family_services',task.family_service_id);requireThat(service.family_id===task.family_id&&service[kind==='analysis'?'analysis_task_id':'execution_task_id']===task.id,'INVALID_STATE',409);
 const family=await c.db.required('families',task.family_id);const rep=family.representative_id?await c.db.one('representatives',family.representative_id):null;
 const profile=rep?await c.db.one('profiles',rep.profile_id):null;
 requireThat(rep?.active&&profile?.active&&profile.role==='representative','NO_ACTIVE_REPRESENTATIVE',409);
 const at=now(),workId='info:'+id;const label={document:'מסמך חסר',answer:'הבהרת נתון',instruction:'הבהרת הנחיה'}[category];
 c.insert('family_tasks',{id:workId,family_id:family.id,title:`${task.task_number} · ${label}`,details,owner_role:'representative',visible_to_client:false,due_on:at.slice(0,10),status:'open',revision:1,created_by:c.actor.profile.id,updated_by:c.actor.profile.id,created_at:at,updated_at:at});
 c.insert('professional_requests',{id,task_kind:kind,task_id:task.id,family_id:family.id,professional_id:task.professional_id,category,details,representative_task_id:workId,created_at:at});
 c.insert('notifications',{id:uuid(),profile_id:rep.profile_id,family_id:family.id,title:`נדרשת השלמה למשימה ${task.task_number}`,target_kind:'familyTask',target_id:workId,created_at:at});
 return {id};
}
