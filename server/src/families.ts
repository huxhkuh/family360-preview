import {z} from 'zod';
import {Context,parse,idSchema,shortText,dateSchema,timestamp,expected,stateIn} from './context';
import {familyAccess,familyFilter,has} from './auth';
import {requireThat,uuid,now,type Row} from './db';
import {conditionMatches} from '../../src/lib/core';
import {questionnaireIssues} from '../../src/families/questionnaire-validation';
import {questionnaireDiscussion} from '../../src/families/questionnaire-discussion';
import {contactPatch} from '../../src/families/questionnaire-decisions';
const taskPayload=z.object({title:z.string().trim().min(3).max(200),details:z.string().max(3000),owner_role:z.enum(['client','representative']),due_on:dateSchema,visible_to_client:z.boolean(),document_id:idSchema.nullable().optional()}).strict();
export async function saveTask(c:Context,a:Row,followup=false){
 const payload=parse(followup?taskPayload.extend({item_id:idSchema.nullable().optional()}):taskPayload,a.p_payload) as Row;
 const meeting=followup?await c.db.required('meetings',a.p_meeting_id):null;const family=await c.staffFamily(meeting?.family_id||a.p_family_id);
 if(meeting)stateIn(meeting,['scheduled','in_progress','completed']);
 requireThat(payload.owner_role!=='client'||payload.visible_to_client,'VALIDATION',400);
 const owner=payload.owner_role==='client'?await c.db.one('profiles',family.client_profile_id):family.representative_id?await c.db.one('representatives',family.representative_id):null;requireThat(owner?.active,'VALIDATION',400);
 if(payload.document_id){const doc=await c.db.required('documents',payload.document_id);requireThat(doc.family_id===family.id);}
 if(payload.item_id){const item=await c.db.required('meeting_items',payload.item_id);requireThat(item.meeting_id===meeting!.id&&item.family_id===family.id&&(!payload.visible_to_client||item.visible_to_client));}
 const table=followup?'meeting_followups':'family_tasks';const id=parse(idSchema,a.p_id);const old=await c.db.one(table,id);
 if(old){requireThat(old.family_id===family.id&&(!meeting||old.meeting_id===meeting.id));expected(old.revision,a.p_expected_revision);stateIn(old,['open','in_progress']);return c.patch(table,old,{...payload,revision:old.revision+1,updated_by:c.actor.profile.id});}
 requireThat(a.p_expected_revision==null||a.p_expected_revision===0,'CONFLICT',409);
 return c.insert(table,{id,family_id:family.id,...payload,...(meeting?{meeting_id:meeting.id,item_id:payload.item_id||null}:{}),status:'open',revision:1,created_by:c.actor.profile.id,updated_by:c.actor.profile.id,created_at:now(),updated_at:now()});
}
export const familyOperations=[ 'rpc_assign_family_representative','rpc_create_family','rpc_save_family','rpc_complete_onboarding','rpc_add_family_service','rpc_search_families','rpc_family_activity','rpc_save_family_task','rpc_save_meeting_followup','rpc_set_family_task_status','rpc_set_followup_status','rpc_record_family_contact','rpc_telephone_contact','rpc_review_questionnaire_topic','rpc_client_request'];
export async function families(c:Context,name:string,a:Row):Promise<unknown>{
 if(name==='rpc_assign_family_representative'){
  requireThat(c.actor.profile.role==='admin'&&has(c.actor,'families.edit'));
  const p=parse(z.object({p_family_id:idSchema,p_representative_id:idSchema,p_expected_updated_at:timestamp}).strict(),a);
  const f=await familyAccess(c.db,c.actor,p.p_family_id,'families.edit');expected(f.updated_at,p.p_expected_updated_at);
  const rep=await c.db.required('representatives',p.p_representative_id);const profile=await c.db.required('profiles',rep.profile_id);
  requireThat(rep.active&&profile.active&&profile.role==='representative','VALIDATION',400);
  const result=c.patch('families',f,{representative_id:rep.id});c.event(f.id,'שויך נציג לטיפול בתיק');return result;
 }
 if(name==='rpc_create_family'){
  requireThat(has(c.actor,'families.edit'));const p=parse(z.object({p_name:shortText,p_client_profile_id:idSchema.nullable(),p_representative_id:idSchema.nullable(),p_phone:z.string().max(40).nullable().optional(),p_email:z.email().nullable().optional()}),a);
  if(c.actor.profile.role!=='admin')requireThat(p.p_representative_id===c.actor.representative?.id);
  if(p.p_client_profile_id){const client=await c.db.required('profiles',p.p_client_profile_id);requireThat(client.active&&client.role==='client','VALIDATION',400);}
  if(p.p_representative_id){const rep=await c.db.required('representatives',p.p_representative_id);const profile=await c.db.required('profiles',rep.profile_id);requireThat(rep.active&&profile.active&&profile.role==='representative','VALIDATION',400);}
  const id=uuid();c.insert('families',{id,case_number:'F-'+id.slice(0,8).toUpperCase(),name:p.p_name,client_profile_id:p.p_client_profile_id,representative_id:p.p_representative_id,phone:p.p_phone||null,email:p.p_email||null,created_at:now(),updated_at:now()});return id;
 }
 if(name==='rpc_save_family'){
  const f=await familyAccess(c.db,c.actor,a.p_family_id,c.actor.profile.role==='client'?undefined:'families.edit');expected(f.updated_at,a.p_expected_updated_at);
  const base=z.object({name:shortText.optional(),contact_name:z.string().max(200).optional(),phone:z.string().max(40).optional(),email:z.union([z.email(),z.literal('')]).optional(),answers:z.record(z.string(),z.unknown()).optional()});
  const p=parse(c.actor.profile.role==='client'?base.strict():base.extend({internal_notes:z.string().max(10000).optional()}).strict(),a.p_patch);
  return c.patch('families',f,contactPatch(f as any,p));
 }
 if(name==='rpc_complete_onboarding'){
  const f=await familyAccess(c.db,c.actor,a.p_family_id,c.actor.profile.role==='client'?undefined:'families.edit');if(f.onboarding_pct===100)return null;
  const services=await c.db.rows('services','active=1');requireThat(!questionnaireIssues(f.answers||{},services as any).length&&f.contact_name?.trim()&&f.phone?.trim(),'QUESTIONNAIRE_INCOMPLETE',400);
  const present=await c.db.rows('family_services','family_id=?',[f.id]);const docs=await c.db.rows('documents','family_id=?',[f.id]);const keys=new Set(docs.map(d=>d.key));
  for(const service of services.filter(s=>s.trigger_conditions.every((r:any)=>conditionMatches(f.answers,r)))){
   if(!present.some(s=>s.service_id===service.id))c.insert('family_services',{id:uuid(),family_id:f.id,service_id:service.id});
   for(const req of service.required_documents){const dt=(await c.db.rows('document_types','key=? AND active=1',[req.doc_key]))[0];if(dt&&!keys.has(dt.key)){keys.add(dt.key);c.insert('documents',{id:uuid(),family_id:f.id,document_type_id:dt.id,service_id:service.id,key:dt.key,name:dt.name,type:dt.type});}}
  }
  c.patch('families',f,{onboarding_pct:100,status:'waiting_docs'});c.event(f.id,'שאלון ההיכרות נשלח');await c.notifyRep(f.id,'שאלון חדש ממתין לבדיקה');return null;
 }
 if(name==='rpc_add_family_service'){const f=await c.staffFamily(a.p_family_id);const service=await c.db.required('services',a.p_service_id);requireThat(service.active,'VALIDATION',400);const old=(await c.db.rows('family_services','family_id=? AND service_id=?',[f.id,service.id]))[0];return old||c.insert('family_services',{id:uuid(),family_id:f.id,service_id:service.id,status:'waiting_analysis'});}
 if(name==='rpc_search_families'){
  requireThat(['admin','representative','client'].includes(c.actor.profile.role));const p=parse(z.object({p_query:z.string().max(200).default(''),p_limit:z.number().int().min(1).max(50).default(25),p_cursor:z.object({id:idSchema,created_at:timestamp}).nullable().optional()}),a);const f=familyFilter(c.actor);const q='%'+p.p_query.replace(/[\\%_]/g,'\\$&')+'%';const cursor=p.p_cursor;
  const items=await c.db.rows('families',`(${f.sql}) AND (name LIKE ? ESCAPE '\\' OR case_number LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\') ${cursor?'AND (created_at<? OR (created_at=? AND id<?))':''}`,[...f.values,q,q,q,q,...(cursor?[cursor.created_at,cursor.created_at,cursor.id]:[])],`ORDER BY created_at DESC,id DESC LIMIT ${p.p_limit+1}`);const more=items.length>p.p_limit;const rows=items.slice(0,p.p_limit).map(r=>({id:r.id,name:r.name,case_number:r.case_number,status:r.status,created_at:r.created_at}));const last=rows.at(-1);return {items:rows,next:more&&last?{id:last.id,created_at:last.created_at}:null};
 }
 if(name==='rpc_family_activity'){const f=await c.staffFamily(a.p_family_id);const kinds=['all','contact','task','event'];requireThat(kinds.includes(a.p_kind||'all'),'VALIDATION',400);const w=await Promise.all([c.db.rows('family_contacts','family_id=?',[f.id]),c.db.rows('family_tasks','family_id=?',[f.id]),c.db.rows('timeline_events','family_id=?',[f.id])]);const items=[...w[0].map(r=>({key:r.id,at:r.occurred_at,kind:'contact',title:'קשר עם המשפחה',detail:r.summary,author:'צוות מסודרים 360',target:'overview'})),...w[1].map(r=>({key:r.id,at:r.updated_at,kind:'task',title:r.title,detail:r.details,author:'',target:'followups'})),...w[2].map(r=>({key:r.id,at:r.created_at,kind:'event',title:r.title,detail:'',author:'',target:'overview'}))].filter(r=>!a.p_kind||a.p_kind==='all'||r.kind===a.p_kind).sort((a,b)=>b.at.localeCompare(a.at)||b.key.localeCompare(a.key));const cursor=a.p_cursor?parse(z.object({at:timestamp,key:idSchema}),a.p_cursor):null;const page=items.filter(r=>!cursor||r.at<cursor.at||r.at===cursor.at&&r.key<cursor.key);const result=page.slice(0,25);return {items:result,next:page.length>25?{at:result[24].at,key:result[24].key}:null};}
 if(name==='rpc_save_family_task'||name==='rpc_save_meeting_followup')return saveTask(c,a,name==='rpc_save_meeting_followup');
 if(name==='rpc_set_family_task_status'||name==='rpc_set_followup_status'){
  const table=name==='rpc_set_followup_status'?'meeting_followups':'family_tasks';const t=await c.db.required(table,a.p_id);await familyAccess(c.db,c.actor,t.family_id,c.actor.profile.role==='client'?undefined:'families.edit');expected(t.revision,a.p_expected_revision);parse(z.enum(['open','in_progress','completed','cancelled']),a.p_status);
  if(c.actor.profile.role==='client'){requireThat(t.visible_to_client&&t.owner_role==='client');stateIn(t,['open','in_progress']);requireThat(['in_progress','completed'].includes(a.p_status));if(t.item_id)requireThat((await c.db.required('meeting_items',t.item_id)).visible_to_client);}
  if(t.document_id&&a.p_status==='completed'){const doc=await c.db.required('documents',t.document_id);requireThat(doc.family_id===t.family_id&&['pending','approved','signed'].includes(doc.status),'VALIDATION',400);}
  return c.patch(table,t,{status:a.p_status,revision:t.revision+1,updated_by:c.actor.profile.id});
 }
 if(name==='rpc_record_family_contact'||name==='rpc_telephone_contact'){
  const f=await c.staffFamily(a.p_family_id);const id=parse(idSchema,a.p_id);const summary=parse(z.string().trim().min(3).max(3000),a.p_summary);const telephone=name==='rpc_telephone_contact';const kind=telephone?'phone':parse(z.enum(['phone','meeting','message','other']),a.p_kind);const at=telephone?now():parse(timestamp,a.p_occurred_at);requireThat(Date.parse(at)<=Date.now()+300000,'VALIDATION',400);
  if(telephone){requireThat(a.p_verified===true,'VALIDATION',400);expected(f.updated_at,a.p_expected_updated_at);parse(z.enum(['internet','phone']),a.p_channel);c.patch('families',f,{preferred_channel:a.p_channel});}
  const old=await c.db.one('family_contacts',id);if(old){requireThat(old.family_id===f.id&&old.created_by===c.actor.profile.id);expected(old.summary,summary);return old;}
  const taskId=telephone&&a.p_callback?'callback:'+id:a.p_next_task_id||null;
  if(taskId)await saveTask(c,{p_id:taskId,p_family_id:f.id,p_payload:telephone?{title:'לחזור למשפחה בעקבות הפנייה הטלפונית',details:'יש לעיין בתיעוד הקשר לפני החזרה.',owner_role:'representative',due_on:a.p_due_on,visible_to_client:true}:a.p_next_task});
  return c.insert('family_contacts',{id,family_id:f.id,kind,summary,occurred_at:at,created_by:c.actor.profile.id,next_task_id:taskId});
 }
 if(name==='rpc_review_questionnaire_topic'){const f=await c.staffFamily(a.p_family_id);expected(f.updated_at,a.p_expected_updated_at);const topic=questionnaireDiscussion(f.answers).find(t=>t.key===a.p_key);requireThat(topic,'VALIDATION',400);expected(topic.token,a.p_token);const note=parse(z.string().trim().min(3).max(1000),a.p_note);return c.patch('families',f,{questionnaire_reviews:{...f.questionnaire_reviews,[topic.key]:{token:topic.token,note}}});}
 if(name==='rpc_client_request'){
  requireThat(c.actor.profile.role==='client');const f=await familyAccess(c.db,c.actor,a.p_family_id);const kind=parse(z.enum(['help','correction']),a.p_kind);const details=parse(z.string().trim().min(3).max(3000),a.p_details);let source:Row|undefined;
  if(kind==='correction'){parse(z.enum(['familyTask','followUp']),a.p_source_kind);source=await c.db.required(a.p_source_kind==='familyTask'?'family_tasks':'meeting_followups',a.p_source_id);requireThat(source.family_id===f.id&&source.visible_to_client&&source.owner_role==='client');if(source.item_id)requireThat((await c.db.required('meeting_items',source.item_id)).visible_to_client);}
  const id=parse(idSchema,a.p_id);const old=await c.db.one('family_tasks',id);if(old){requireThat(old.family_id===f.id);expected(old.details,details);return old;}
  await c.notifyRep(f.id,'פנייה חדשה מהמשפחה');return c.insert('family_tasks',{id,family_id:f.id,title:kind==='help'?'בקשת עזרה מהמשפחה':'בקשת תיקון מהמשפחה',details,owner_role:'representative',visible_to_client:true,due_on:new Date().toISOString().slice(0,10),status:'open',revision:1,created_by:c.actor.profile.id,updated_by:c.actor.profile.id,request_kind:kind,source_kind:source?a.p_source_kind:null,source_id:source?.id||null});
 }
}
