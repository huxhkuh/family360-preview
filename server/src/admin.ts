import {z} from 'zod';
import {Context,parse,shortText,idSchema,expected} from './context';
import {admin} from './auth';
import {requireThat,uuid,now,type Row} from './db';
const permissions=z.array(z.enum(['families.edit','families.view_all','analysis.send','analysis.approve','execution.send','execution.approve','documents.manage']));
const schemas:Record<string,z.ZodObject<any>>={
 profiles:z.object({name:shortText,phone:z.string().max(40),role:z.enum(['admin','representative','professional','client','marketer']),active:z.boolean()}),
 representatives:z.object({active:z.boolean(),permissions}),
 professionals:z.object({business_name:shortText,active:z.boolean(),analysis_enabled:z.boolean(),execution_enabled:z.boolean(),analysis_sla_hours:z.number().int().min(1).max(8760).nullable(),execution_sla_hours:z.number().int().min(1).max(8760).nullable()}),
 services:z.object({key:z.string().regex(/^[a-z][a-z0-9_]*$/),name:shortText,icon:z.string().max(100).nullable(),category:z.string().max(100),description:z.string().max(5000),active:z.boolean(),sort_order:z.number().int(),analysis_sla_hours:z.number().int().min(1).max(8760).nullable(),execution_sla_hours:z.number().int().min(1).max(8760).nullable(),trigger_conditions:z.array(z.object({field:z.string(),op:z.enum(['exists','equals','not_equals','contains','gt','lt']),value:z.unknown().optional()})),client_fields:z.array(z.object({key:z.string(),label:z.string(),type:z.string().optional(),required:z.boolean().optional(),options:z.array(z.string()).optional(),show_when:z.any().optional()})),professional_fields:z.array(z.object({key:z.string(),label:z.string()})),required_documents:z.array(z.object({doc_key:z.string()})),analysis_result_fields:z.array(z.unknown()),automation_settings:z.record(z.string(),z.unknown())}),
 document_types:z.object({key:z.string().regex(/^[a-z][a-z0-9_]*$/),name:shortText,type:z.enum(['file','signature']),description:z.string().max(10000),active:z.boolean(),sort_order:z.number().int()}),
 message_templates:z.object({key:shortText,name:shortText,subject:z.string().max(500),body:z.string().max(10000),active:z.boolean()}),
 automations:z.object({key:shortText,name:shortText,event_key:shortText,active:z.boolean(),delay_minutes:z.number().int().min(0).max(525600),channel:z.enum(['in_app','email']),settings:z.record(z.string(),z.unknown())})
};
export const adminOperations=['rpc_admin_save','rpc_set_setting','rpc_set_professional_service','rpc_list_resources','rpc_save_resource','rpc_record_commission','rpc_mark_notifications_read','rpc_run_reminders'];
export async function administrative(c:Context,name:string,a:Row):Promise<unknown>{
 if(name==='rpc_mark_notifications_read'){c.statements.push(c.db.statement('UPDATE notifications SET read_at=? WHERE profile_id=? AND read_at IS NULL',[now(),c.actor.profile.id]));return null;}
 if(name==='rpc_list_resources'){if(a.p_manage)admin(c.actor);return c.db.rows('resources',a.p_manage?'1=1':'active=1 AND verified_at IS NOT NULL');}
 admin(c.actor);
 if(name==='rpc_admin_save'){
  const schema=schemas[a.p_entity];requireThat(schema,'VALIDATION',400);const patch=parse(schema.partial().strict(),a.p_patch) as Row;requireThat(Object.keys(patch).length,'VALIDATION',400);
  const old=a.p_id?await c.db.required(a.p_entity,a.p_id):null;requireThat(old||['services','document_types','message_templates','automations'].includes(a.p_entity),'VALIDATION',400);
  if(a.p_entity==='profiles'){
   requireThat(old!.id!==c.actor.profile.id||!('role'in patch||'active'in patch),'INVALID_STATE',409);
   if(patch.active===false||patch.role&&patch.role!==old!.role)patch.token_valid_after=Math.floor(Date.now()/1000)+1;
   const nextRole=patch.role||old!.role;if(['representative','professional','marketer'].includes(nextRole)){
    const table=nextRole==='representative'?'representatives':nextRole==='professional'?'professionals':'partners';const exists=(await c.db.rows(table,'profile_id=?',[old!.id]))[0];if(!exists)c.insert(table,{id:uuid(),profile_id:old!.id,...(nextRole==='professional'?{business_name:old!.name}:nextRole==='marketer'?{name:patch.name||old!.name,code:uuid().replaceAll('-','').slice(0,16)}:{permissions:['families.edit']})});
   }
  }
  return old?c.patch(a.p_entity,old,patch):c.insert(a.p_entity,{id:uuid(),...patch});
 }
 if(name==='rpc_set_professional_service'){await c.db.required('professionals',a.p_professional_id);await c.db.required('services',a.p_service_id);const values={analysis_enabled:parse(z.boolean(),a.p_analysis),execution_enabled:parse(z.boolean(),a.p_execution)};const old=(await c.db.rows('professional_services','professional_id=? AND service_id=?',[a.p_professional_id,a.p_service_id]))[0];return old?c.patch('professional_services',old,values):c.insert('professional_services',{id:uuid(),professional_id:a.p_professional_id,service_id:a.p_service_id,...values});}
 if(name==='rpc_set_setting'){const key=parse(z.enum(['system_name','support_email','default_analysis_sla','default_execution_sla']),a.p_key);const value=key.startsWith('default_')?parse(z.number().int().min(1).max(8760),a.p_value):parse(z.string().min(1).max(500),a.p_value);c.statements.push(c.db.statement('INSERT INTO system_settings(key,value,updated_at,updated_by) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by',[key,JSON.stringify(value),now(),c.actor.profile.id]));return null;}
 if(name==='rpc_save_resource'){
  const p=parse(z.object({title:z.string().trim().min(3).max(200),description:z.string().max(3000),url:z.string().max(2000),phone:z.string().max(40),chapter:z.string().min(1).max(80),verified:z.boolean(),active:z.boolean()}).strict(),a.p_payload);if(p.url){let url:URL;try{url=new URL(p.url);}catch{throw Error('VALIDATION');}requireThat(url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(url.hostname)&&!url.hostname.endsWith('.local'),'VALIDATION',400);}
  const id=parse(idSchema,a.p_id);const old=await c.db.one('resources',id);if(old)expected(old.revision,a.p_expected_revision);else requireThat(a.p_expected_revision==null||a.p_expected_revision===0,'CONFLICT',409);
  const changed=old&&['title','description','url','phone','chapter'].some(k=>old[k]!==p[k as keyof typeof p]);const verified=p.verified&&!changed;const {verified:_,...fields}=p;const row={...fields,verified_at:verified?now():null,verified_by:verified?c.actor.profile.id:null,revision:(old?.revision||0)+1,updated_at:now()};return old?c.patch('resources',old,row):c.insert('resources',{id,...row});
 }
 if(name==='rpc_record_commission'){
  const p=parse(z.object({p_id:idSchema,p_partner_id:idSchema,p_kind:z.enum(['credit','payout']),p_referral_id:idSchema.nullable().optional(),p_amount_agorot:z.number().int().positive().max(100000000),p_note:z.string().trim().min(3).max(500)}),a);const partner=await c.db.required('partners',p.p_partner_id);requireThat(partner.active,'VALIDATION',400);if(p.p_referral_id)requireThat((await c.db.rows('referrals','public_id=? AND partner_id=?',[p.p_referral_id,partner.id])).length,'VALIDATION',400);
  const row={id:p.p_id,partner_id:partner.id,kind:p.p_kind,referral_id:p.p_referral_id||null,amount_agorot:p.p_amount_agorot,note:p.p_note};const old=await c.db.one('commission_entries',row.id);if(old){requireThat(Object.entries(row).every(([k,v])=>old[k]===v),'CONFLICT',409);return old;}
  if(row.kind==='payout'){const entries=await c.db.rows('commission_entries','partner_id=?',[partner.id]);const balance=entries.reduce((sum,e)=>sum+(e.kind==='credit'?1:-1)*e.amount_agorot,0);requireThat(balance>=row.amount_agorot,'INSUFFICIENT_BALANCE',409);}
  return c.insert('commission_entries',{...row,created_by:c.actor.profile.id,created_at:now()});
 }
 if(name==='rpc_run_reminders'){
  const today=now().slice(0,10);let count=0;for(const table of ['analysis_tasks','execution_tasks']){
   const tasks=await c.db.rows(table,"due_at<? AND status IN ('assigned','in_progress','sent_execution','execution_in_progress','waiting_client','needs_info')",[now()],'LIMIT 100');
   for(const task of tasks){const pro=await c.db.required('professionals',task.professional_id);const profile=await c.db.required('profiles',pro.profile_id);if(!pro.active||!profile.active)continue;const exists=await c.db.statement('SELECT task_id FROM reminder_receipts WHERE task_id=? AND profile_id=? AND day=?',[task.id,pro.profile_id,today]).first();if(exists)continue;c.statements.push(c.db.statement('INSERT INTO reminder_receipts(task_id,profile_id,day) VALUES (?,?,?)',[task.id,pro.profile_id,today]));c.notify(pro.profile_id,task.family_id,'משימה חרגה ממועד הטיפול');count++;}
  }return {created:count};
 }
}
