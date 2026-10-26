import {z} from 'zod';
import {Context,parse,idSchema,stateIn} from './context';
import {requireThat,now,type Row} from './db';
import {assign,eligible} from './tasks';
export const offerOperations=['rpc_list_professional_offers','rpc_create_professional_offer','rpc_cancel_professional_offer','rpc_claim_professional_offer'];
export async function offers(c:Context,name:string,a:Row):Promise<unknown>{
 if(name==='rpc_list_professional_offers'){
  if(c.actor.profile.role==='professional'){const rows=await c.db.rows('professional_offers',"status='open' AND expires_at>?",[now()]);const result=[];for(const row of rows){if(!row.candidates.includes(c.actor.professional!.id))continue;const fs=await c.db.required('family_services',row.family_service_id);const service=await c.db.required('services',fs.service_id);try{await eligible(c,c.actor.professional!.id,service,row.kind);}catch{continue;}result.push({id:row.id,kind:row.kind,service_name:service.name,status:row.status,created_at:row.created_at,expires_at:row.expires_at});}return result;}
  const fs=await c.db.required('family_services',a.p_family_service_id);await c.staffFamily(fs.family_id);return c.db.rows('professional_offers','family_service_id=?',[fs.id]);
 }
 if(name==='rpc_create_professional_offer'){
  const fs=await c.db.required('family_services',a.p_family_service_id);const kind=parse(z.enum(['analysis','execution']),a.p_kind);await c.staffFamily(fs.family_id,kind+'.send');stateIn(fs,kind==='analysis'?['waiting_analysis']:['client_approved_execution']);const candidates=parse(z.array(idSchema).min(1).max(50),a.p_candidates);requireThat(new Set(candidates).size===candidates.length,'VALIDATION',400);const service=await c.db.required('services',fs.service_id);for(const id of candidates)await eligible(c,id,service,kind);
  return c.insert('professional_offers',{id:parse(idSchema,a.p_id),family_service_id:fs.id,kind,candidates,note:parse(z.string().max(2000),a.p_note||''),source_analysis_task_id:fs.analysis_task_id,source_execution_task_id:fs.execution_task_id,created_by:c.actor.profile.id,created_at:now(),expires_at:new Date(Date.now()+48*3600000).toISOString(),status:'open'});
 }
 const offer=await c.db.required('professional_offers',a.p_id);const fs=await c.db.required('family_services',offer.family_service_id);
 if(name==='rpc_cancel_professional_offer'){await c.staffFamily(fs.family_id,offer.kind+'.send');stateIn(offer,['open']);return c.patch('professional_offers',offer,{status:'cancelled'});}
 requireThat(c.actor.profile.role==='professional'&&offer.candidates.includes(c.actor.professional!.id));stateIn(offer,['open']);requireThat(Date.parse(offer.expires_at)>Date.now(),'INVALID_STATE',409);expectedSources(fs,offer);const task=await assign(c,fs,c.actor.professional!.id,offer.kind,{},true);c.patch('professional_offers',offer,{status:'claimed',claimed_by:c.actor.professional!.id,task_id:task.id});return task.id;
}
function expectedSources(fs:Row,offer:Row){requireThat(fs.analysis_task_id===offer.source_analysis_task_id&&fs.execution_task_id===offer.source_execution_task_id,'CONFLICT',409);}
