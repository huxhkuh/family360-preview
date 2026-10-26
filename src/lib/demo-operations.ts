// @ts-nocheck
// Local simulation only: never sends mail, changes Auth or contacts a server.
import {workspaceSchema} from './model';
export function operationRpc(name,a,state,role){
 const admin=role==='admin',staff=admin||role==='representative';const id=()=>crypto.randomUUID();const now=()=>new Date().toISOString();
 const require=(condition,error='PERMISSION_DENIED')=>{if(!condition)throw Error(error);};
 const audit=(entity,description)=>state.audit.unshift({id:id(),entity_type:entity,action:'update',description,created_at:now()});
 const requireFamily=(familyId,permission='families.edit')=>{const family=state.families.find(f=>f.id===familyId);require(staff&&family);if(!admin){const rep=state.representatives.find(r=>r.profile_id==='representative'&&r.active);const profile=state.profiles.find(p=>p.id===rep?.profile_id&&p.active&&p.role==='representative');require(rep&&profile&&rep.permissions.includes(permission)&&(family.representative_id===rep.id||rep.permissions.includes('families.view_all')));}return family;};
 const stamp=family=>{family.updated_at=new Date(Math.max(Date.now(),Date.parse(family.updated_at||'1970-01-01')+1)).toISOString();};
 const event=(family,title)=>state.timeline.push({id:id(),family_id:family.id,title,created_at:now()});
 if(name==='rpc_assign_family_representative'){
  require(admin);const family=requireFamily(a.p_family_id);require(family.updated_at===a.p_expected_updated_at,'CONFLICT');const rep=state.representatives.find(r=>r.id===a.p_representative_id&&r.active);require(rep&&state.profiles.some(p=>p.id===rep.profile_id&&p.active&&p.role==='representative'),'VALIDATION');
  family.representative_id=rep.id;stamp(family);event(family,'שויך נציג מטפל לתיק');return family;
 }
 if(name==='rpc_create_family'){
  require(admin);const name=String(a.p_name||'').trim(),phone=String(a.p_phone||'').trim(),email=String(a.p_email||'').trim();require(name.length>=2&&name.length<=150&&phone.length<=40&&email.length<=320,'VALIDATION');
  const client=state.profiles.find(p=>p.id===a.p_client_profile_id&&p.active&&p.role==='client');const rep=state.representatives.find(r=>r.id===a.p_representative_id&&r.active);require(client&&rep&&state.profiles.some(p=>p.id===rep.profile_id&&p.active&&p.role==='representative'),'VALIDATION');
  const family={id:id(),name,case_number:'F-'+id().slice(0,8).toUpperCase(),status:'new',onboarding_pct:0,client_profile_id:client.id,representative_id:rep.id,phone,email,answers:{},updated_at:now()};state.families.push(family);event(family,'נפתח תיק משפחה');return family.id;
 }
 if(['rpc_send_to_analysis','rpc_send_to_execution'].includes(name)){
  const kind=name.endsWith('analysis')?'analysis':'execution',fs=state.familyServices.find(s=>s.id===a.p_family_service_id);require(fs,'NOT_FOUND');const family=requireFamily(fs.family_id,kind+'.send');require(fs.status===(kind==='analysis'?'waiting_analysis':'client_approved_execution'),'INVALID_STATE');
  const service=state.services.find(s=>s.id===fs.service_id&&s.active),pro=state.professionals.find(p=>p.id===a.p_professional_id&&p.active&&p.profile_active&&p[kind+'_enabled']);require(service&&pro&&state.profiles.some(p=>p.id===pro.profile_id&&p.active&&p.role==='professional')&&state.professionalServices.some(p=>p.professional_id===pro.id&&p.service_id===service.id&&p[kind+'_enabled']),'INELIGIBLE_PROFESSIONAL');
  const item=kind==='execution'?state.meetingItems.find(i=>i.family_service_id===fs.id&&i.client_decision==='progress'&&state.meetings.some(m=>m.id===i.meeting_id&&m.status==='completed')):undefined;if(kind==='execution')require(item,'INVALID_STATE');
  const documentIds=a.p_document_ids||[];require(Array.isArray(documentIds)&&documentIds.length<=100&&documentIds.every(docId=>state.documents.some(d=>d.id===docId&&d.family_id===family.id&&['approved','signed'].includes(d.status))),'VALIDATION');
  const note=String((kind==='analysis'?a.p_note:a.p_rep_note)||'');require(note.length<=5000,'VALIDATION');
  const task={id:id(),family_id:family.id,family_service_id:fs.id,service_id:service.id,professional_id:pro.id,task_number:(kind==='analysis'?'AN-':'EX-')+String(state.analysisTasks.length+state.executionTasks.length+1).padStart(6,'0'),status:kind==='analysis'?'assigned':'sent_execution',due_at:new Date(Date.now()+(service[kind+'_sla_hours']||(kind==='analysis'?72:96))*3600000).toISOString(),snapshot:(service.professional_fields||[]).map(f=>({key:f.key,label:f.label,value:family.answers?.[f.key]??null})),...(kind==='analysis'?{rep_note:note}:{instructions:item.execution_instructions||'',representative_note:note,client_name:family.contact_name||family.name,client_phone:family.phone,source_meeting_id:item.meeting_id,source_meeting_item_id:item.id,approved_actions:item.approved_actions||[]})};
  state[kind==='analysis'?'analysisTasks':'executionTasks'].push(task);Object.assign(fs,{status:kind==='analysis'?'in_analysis':'sent_execution',[kind+'_task_id']:task.id});state.taskDocuments??=[];for(const docId of documentIds)state.taskDocuments.push({id:id(),document_id:docId,task_id:task.id,kind,revoked_at:null});event(family,kind==='analysis'?'תחום נשלח לבדיקה מקצועית':'תחום נשלח לביצוע');return task;
 }
 if(['rpc_approve_analysis','rpc_return_analysis'].includes(name)){
  const fs=state.familyServices.find(s=>s.id===a.p_family_service_id);require(fs,'NOT_FOUND');const family=requireFamily(fs.family_id,'analysis.approve'),task=state.analysisTasks.find(t=>t.id===fs.analysis_task_id&&t.family_service_id===fs.id);require(fs.status==='analysis_received'&&task?.status==='submitted','INVALID_STATE');const approve=name==='rpc_approve_analysis',reason=String(a.p_reason||'').trim();if(!approve)require(reason.length>=3&&reason.length<=3000,'VALIDATION');
  task.status=approve?'approved':'returned';if(!approve)task.return_history=[...(task.return_history||[]),{reason,at:now()}];fs.status=approve?'approved_analysis':'in_analysis';event(family,approve?'ממצאים מקצועיים אושרו':'ניתוח הוחזר להשלמה');return fs;
 }
 if(name==='rpc_schedule_meeting'){
  const family=requireFamily(a.p_family_id);require(Number.isFinite(Date.parse(a.p_scheduled_at))&&['inperson','phone','video','zoom'].includes(a.p_type),'VALIDATION');require(!state.meetings.some(m=>m.family_id===family.id&&['scheduled','in_progress'].includes(m.status)),'INVALID_STATE');
  const tasks=state.analysisTasks.filter(t=>t.family_id===family.id&&t.status==='approved'&&state.familyServices.some(fs=>fs.id===t.family_service_id&&fs.analysis_task_id===t.id&&fs.status==='approved_analysis'));require(tasks.length>0,'INVALID_STATE');
  const meeting={id:id(),family_id:family.id,status:'scheduled',scheduled_at:new Date(a.p_scheduled_at).toISOString(),type:a.p_type};state.meetings.push(meeting);tasks.forEach((task,index)=>{const fs=state.familyServices.find(s=>s.id===task.family_service_id),service=state.services.find(s=>s.id===task.service_id);state.meetingItems.push({id:id(),meeting_id:meeting.id,family_id:family.id,family_service_id:fs.id,analysis_task_id:task.id,title:service?.name||'תחום לבדיקה',client_summary:task.client_summary,current_situation:task.current_situation,recommendation:task.recommendation,financial:structuredClone(task.financial||{}),visible_to_client:true,client_decision:'undecided',sort_order:index});fs.status='waiting_meeting';});family.status='meeting_set';event(family,'נקבעה שיחה עם המשפחה');return meeting;
 }
 if(name==='rpc_share_document'){
  const doc=state.documents.find(d=>d.id===a.p_document_id);require(doc,'NOT_FOUND');requireFamily(doc.family_id,'documents.manage');require(['analysis','execution'].includes(a.p_kind),'VALIDATION');const task=state[a.p_kind==='analysis'?'analysisTasks':'executionTasks'].find(t=>t.id===a.p_task_id);require(task&&task.family_id===doc.family_id,'VALIDATION');const revoked=a.p_revoke===true;if(!revoked)require(['approved','signed'].includes(doc.status),'INVALID_STATE');state.taskDocuments??=[];let share=state.taskDocuments.find(s=>s.document_id===doc.id&&s.task_id===task.id&&s.kind===a.p_kind);if(share)share.revoked_at=revoked?now():null;else if(!revoked){share={id:id(),document_id:doc.id,task_id:task.id,kind:a.p_kind,revoked_at:null};state.taskDocuments.push(share);}return share||null;
 }
 if(name==='rpc_admin_save'){
  require(admin);const map={profiles:'profiles',services:'services',professionals:'professionals',representatives:'representatives',document_types:'documentTypes',message_templates:'templates',automations:'automations'};const key=map[a.p_entity];require(!!key,'VALIDATION');
  const allowed={profiles:['name','role','active'],services:['name','key','active','analysis_sla_hours','execution_sla_hours','client_fields','trigger_conditions','professional_fields','required_documents'],professionals:['business_name','active','analysis_enabled','execution_enabled'],representatives:['active','permissions'],document_types:['key','name','type','description','active'],message_templates:['subject','body'],automations:['active']}[a.p_entity];
  require(a.p_patch&&Object.keys(a.p_patch).every(k=>allowed.includes(k)),'VALIDATION');require(!(a.p_entity==='profiles'&&a.p_id==='admin'&&('role' in a.p_patch||'active' in a.p_patch)),'INVALID_STATE');
  require(a.p_id||['services','document_types'].includes(a.p_entity),'VALIDATION');const old=a.p_id?state[key].find(r=>r.id===a.p_id):null;require(!a.p_id||old,'NOT_FOUND');
  const base=key==='services'?{active:true,analysis_sla_hours:72,execution_sla_hours:96,client_fields:[],trigger_conditions:[],professional_fields:[],required_documents:[]}:key==='documentTypes'?{active:true,description:''}:{};
  const row=workspaceSchema.shape[key].element.parse({...base,...old,...a.p_patch,id:old?.id||id()});
  if('name' in row)require(row.name.trim().length>0&&row.name.length<=200,'VALIDATION');
  if(['services','documentTypes'].includes(key)){require(/^[a-z][a-z0-9_]*$/.test(row.key),'VALIDATION');require(!state[key].some(r=>r.key===row.key&&r.id!==row.id),'CONFLICT');}
  if(key==='services')for(const k of ['analysis_sla_hours','execution_sla_hours'])require(Number.isInteger(row[k])&&row[k]>=1&&row[k]<=8760,'VALIDATION');
  if(key==='representatives')require(row.permissions.every(p=>['families.edit','families.view_all','analysis.send','analysis.approve','execution.send','execution.approve','documents.manage'].includes(p)),'VALIDATION');
  if(old)Object.assign(old,row);else state[key].push(row);audit(a.p_entity,'נשמר בדמו: '+(row.name||row.id));return row;
 }
 if(name==='rpc_set_setting'){require(admin);require(a.p_key==='system_name'&&typeof a.p_value==='string'&&a.p_value.trim().length>0&&a.p_value.length<=500,'VALIDATION');state.settings[a.p_key]=a.p_value;audit('setting','שם המערכת עודכן בדמו');return null;}
 if(name==='rpc_set_professional_service'){
  require(admin);require(state.professionals.some(p=>p.id===a.p_professional_id)&&state.services.some(s=>s.id===a.p_service_id),'VALIDATION');
  const old=state.professionalServices.find(s=>s.professional_id===a.p_professional_id&&s.service_id===a.p_service_id);const row={id:old?.id||id(),professional_id:a.p_professional_id,service_id:a.p_service_id,analysis_enabled:!!a.p_analysis,execution_enabled:!!a.p_execution};if(old)Object.assign(old,row);else state.professionalServices.push(row);audit('professional','כשירות לתחום עודכנה בדמו');return null;
 }
 if(['rpc_save_analysis_draft','rpc_submit_analysis'].includes(name)){
  const t=state.analysisTasks.find(t=>t.id===a.p_task_id);require(role==='professional'&&t?.professional_id==='pro1');require(['assigned','in_progress','returned'].includes(t.status),'INVALID_STATE');
  const p=a.p_payload;require(p&&typeof p==='object','VALIDATION');if(name==='rpc_submit_analysis')require(['green','yellow','orange','red'].includes(p.result_tone)&&p.current_situation?.trim()&&p.recommendation?.trim()&&p.client_summary?.trim(),'VALIDATION');
  Object.assign(t,p,{status:name==='rpc_submit_analysis'?'submitted':'in_progress'});if(name==='rpc_submit_analysis'){const fs=state.familyServices.find(s=>s.id===t.family_service_id);if(fs)fs.status='analysis_received';}return t;
 }
 if(['rpc_start_execution','rpc_execution_note','rpc_report_execution_complete','rpc_approve_execution','rpc_return_execution','rpc_execution_history'].includes(name)){
  const t=state.executionTasks.find(t=>t.id===a.p_task_id);require(t&&(staff||role==='professional'&&t.professional_id==='pro1'));const owner=role==='professional'&&t.professional_id==='pro1';const approve=admin||role==='representative'&&state.representatives[0].permissions.includes('execution.approve');
  const active=['execution_in_progress','waiting_client','needs_info'].includes(t.status);const history=state.executionHistory[t.id]??={messages:[],updates:[]};
  const note=text=>history.updates.push({id:id(),text});const status=s=>{t.status=s;const fs=state.familyServices.find(s=>s.id===t.family_service_id);if(fs)fs.status=s;};
  if(name==='rpc_execution_history')return history;
  if(name==='rpc_start_execution'){require(owner);require(t.status==='sent_execution','INVALID_STATE');status('execution_in_progress');note('הטיפול התחיל בדמו');}
  if(name==='rpc_execution_note'){
   require(active,'INVALID_STATE');require(typeof a.p_text==='string'&&a.p_text.trim().length>0&&a.p_text.length<=5000,'VALIDATION');require(['note','message','wait','needs_info','resume'].includes(a.p_action),'VALIDATION');
   if(a.p_action==='message')history.messages.push({id:id(),body:a.p_text,sender_role:role});else{if(a.p_action!=='note'){require(owner||approve);status({wait:'waiting_client',needs_info:'needs_info',resume:'execution_in_progress'}[a.p_action]);}note(a.p_text);}
  }
  if(name==='rpc_report_execution_complete'){require(owner);require(active,'INVALID_STATE');require(a.p_outcome?.trim()&&a.p_summary?.trim()&&(a.p_value===null||Number.isFinite(a.p_value)&&a.p_value>=0),'VALIDATION');Object.assign(t,{outcome_summary:a.p_summary,outcome:a.p_outcome,outcome_result:a.p_result,outcome_value:a.p_value});status('execution_reported_complete');note(a.p_summary);}
  if(name==='rpc_return_execution'){require(approve);require(t.status==='execution_reported_complete','INVALID_STATE');require(a.p_reason?.trim(),'VALIDATION');status('execution_in_progress');note('הוחזר לטיפול: '+a.p_reason);}
  if(name==='rpc_approve_execution'){require(approve);require(t.status==='execution_reported_complete','INVALID_STATE');status('completed');note('הביצוע אושר בדמו');}
  return t;
 }
 return undefined;
}
