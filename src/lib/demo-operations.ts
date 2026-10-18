// @ts-nocheck
// Local simulation only: never sends mail, changes Auth or contacts a server.
import {workspaceSchema} from './model';
export function operationRpc(name,a,state,role){
 const admin=role==='admin',staff=admin||role==='representative';const id=()=>crypto.randomUUID();const now=()=>new Date().toISOString();
 const require=(condition,error='PERMISSION_DENIED')=>{if(!condition)throw Error(error);};
 const audit=(entity,description)=>state.audit.unshift({id:id(),entity_type:entity,action:'update',description,created_at:now()});
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
