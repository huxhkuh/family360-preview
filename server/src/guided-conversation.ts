import {z} from 'zod';
import {Context,parse,expected,stateIn} from './context';
import {uuid,now,requireThat,type Row} from './db';
import {conversationGuides,guidedChoices,guideForService} from '../../src/meetings/conversation-guide';

export const guidedOperations=['rpc_save_guided_decision'];
export async function guidedConversation(c:Context,_name:string,a:Row){
 const meeting=await c.db.required('meetings',a.p_meeting_id);const family=await c.staffFamily(meeting.family_id);stateIn(meeting,['in_progress']);
 const key=parse(z.string().min(1).max(180),a.p_topic_key),decision=parse(z.enum(['progress','thinking','declined','no_action','not_relevant']),a.p_decision),note=parse(z.string().max(5000),a.p_note||'');
 const item=key.startsWith('item:')?await c.db.required('meeting_items',key.slice(5)):null;
 if(item)requireThat(item.meeting_id===meeting.id&&item.family_id===family.id&&item.visible_to_client);
 const guide=conversationGuides.find(g=>g.key===key);requireThat(item||guide,'VALIDATION',400);
 const instructions=parse(z.string().max(5000),a.p_instructions??item?.execution_instructions??'');
 const old=(await c.db.rows('guided_decisions','meeting_id=? AND topic_key=?',[meeting.id,key]))[0];
 // An identical retried request is safe even if its response was lost.
 if(old&&old.decision===decision&&old.note===note&&(!item||instructions===(item.execution_instructions||'')))return old;
 expected(old?.revision||0,a.p_expected_revision);
 if(old?.task_id&&old.decision==='progress'&&decision!=='progress'){
  const table=old.task_kind==='followup'?'family_tasks':old.task_kind+'_tasks';const task=await c.db.required(table,old.task_id);
  requireThat(['cancelled','not_completed','completed','reassigned'].includes(task.status),'HANDOFF_ALREADY_ACTIVE',409);
 }
 let taskId=old?.task_id||null,taskKind=old?.task_kind||null,handoff=old?.handoff||'';
 const title=item?.title||guide!.title;
 if(decision!=='thinking'&&old?.decision==='thinking'&&taskKind==='followup'){const reminder=await c.db.required('family_tasks',taskId);c.patch('family_tasks',reminder,{status:'completed',revision:reminder.revision+1});taskId=null;taskKind=null;handoff='';}
 if(decision==='progress'&&!taskId){
  const existingFs=item?.family_service_id?await c.db.required('family_services',item.family_service_id):null;
  const services=await c.db.rows('services','active=1');const effectiveGuide=guide||(item&&guideForService(item.title,services.find(s=>s.id===item.service_id)?.key));const service=existingFs?services.find(s=>s.id===existingFs.service_id):services.find(s=>effectiveGuide?.serviceKeys.includes(s.key));
  const fs=existingFs||(service?(await c.db.rows('family_services','family_id=? AND service_id=?',[family.id,service.id]))[0]:null);
  const analysis=fs?.analysis_task_id?await c.db.one('analysis_tasks',fs.analysis_task_id):null;
  const kind=item&&analysis?.status==='approved'?'execution':'analysis';
  // A family service can have at most one active job of the requested kind.
  const active=fs?(await c.db.rows(kind+'_tasks',"family_service_id=? AND status NOT IN ('cancelled','reassigned','completed','not_completed','approved')",[fs.id]))[0]:null;
  const profiles=await c.db.rows('profiles',"active=1 AND role='professional'");const pros=service?await c.db.rows('professionals',`active=1 AND ${kind}_enabled=1`):[];
  const links=service?await c.db.rows('professional_services',`service_id=? AND ${kind}_enabled=1`,[service.id]):[];
  const jobs=service?await c.db.rows(kind+'_tasks',"status NOT IN ('cancelled','reassigned','completed','not_completed','approved')"):[];
  const candidates=pros.filter(p=>profiles.some(x=>x.id===p.profile_id)&&links.some(x=>x.professional_id===p.id));
  candidates.sort((a,b)=>Number(b.id===analysis?.professional_id)-Number(a.id===analysis?.professional_id)||jobs.filter(j=>j.professional_id===a.id).length-jobs.filter(j=>j.professional_id===b.id).length||a.id.localeCompare(b.id));
  if(active){taskId=active.id;taskKind=kind;handoff='ההסכמה צורפה למשימה הקיימת';c.event(family.id,`${title}: הסכמת המשפחה צורפה לטיפול קיים`);}
  else if(service&&candidates[0]){
   await c.staffFamily(family.id,kind+'.send');const pro=candidates[0];const fsId=fs?.id||uuid();
   if(!fs)c.insert('family_services',{id:fsId,family_id:family.id,service_id:service.id,status:kind==='analysis'?'assigned':'sent_execution'});
   taskId=uuid();taskKind=kind;const hours=Number(pro[kind+'_sla_overrides']?.[service.key]||pro[kind+'_sla_hours']||service[kind+'_sla_hours']||(kind==='analysis'?72:96));
   const task:Row={id:taskId,task_number:(kind==='analysis'?'AN-':'EX-')+taskId.slice(0,8).toUpperCase(),family_id:family.id,family_service_id:fsId,service_id:service.id,professional_id:pro.id,representative_id:family.representative_id,status:kind==='analysis'?'assigned':'sent_execution',snapshot:(service.professional_fields||[]).map((f:Row)=>({label:f.label,key:f.key,value:family.answers?.[f.key]??null})),due_at:new Date(Date.now()+hours*3600000).toISOString(),created_at:now(),updated_at:now()};
   if(kind==='execution')Object.assign(task,{source_meeting_id:meeting.id,source_meeting_item_id:item!.id,analysis_task_id:analysis!.id,client_name:family.contact_name||family.name,client_phone:family.phone,client_email:family.email,client_decision_at:now(),instructions:instructions||item!.recommendation,approved_actions:item!.approved_actions||[]});
   else task.rep_note=`${title} — המשפחה מעוניינת בבדיקה מקצועית בעקבות השיחה.`;
   c.insert(kind+'_tasks',task);c.patch('family_services',{id:fsId},{status:kind==='analysis'?'assigned':'sent_execution',[kind+'_task_id']:taskId,professional_id:pro.id,sent_at:now()});
   handoff=`הועבר ל${profiles.find(p=>p.id===pro.profile_id)?.name||'בעל המקצוע'} · ${kind==='analysis'?'בדיקה מקצועית':'המשך ביצוע'}`;
   c.notify(pro.profile_id,family.id,'הסכמת המשפחה: '+title);c.event(family.id,handoff+' — '+title);
  }else{
   taskId=uuid();taskKind='followup';handoff=service?'ממתין לשיוך בעל מקצוע מתאים':'הועבר לנציג להמשך טיפול';
   c.insert('family_tasks',{id:taskId,family_id:family.id,title:(service?'שיוך בעל מקצוע: ':'המשך טיפול: ')+title,details:note||guide?.say||item?.recommendation||'',owner_role:'representative',created_by:c.actor.profile.id,updated_by:c.actor.profile.id,due_on:now().slice(0,10),visible_to_client:false,status:'open',revision:1,updated_at:now()});
   await c.notifyRep(family.id,handoff+' — '+title);if(service)for(const admin of await c.db.rows('profiles',"role='admin' AND active=1"))c.notify(admin.id,family.id,'נדרש שיוך: '+title);
  }
 }else if(decision==='thinking'&&!taskId){
  taskId=uuid();taskKind='followup';handoff='נפתחה תזכורת לנציג';c.insert('family_tasks',{id:taskId,family_id:family.id,title:'לחזור למשפחה: '+title,details:note,owner_role:'representative',created_by:c.actor.profile.id,updated_by:c.actor.profile.id,due_on:new Date(Date.now()+7*86400000).toISOString().slice(0,10),visible_to_client:false,status:'open',revision:1,updated_at:now()});
 }
 if(item)c.patch('meeting_items',item,{client_decision:decision==='not_relevant'?'no_action':decision,decision_note:note,execution_instructions:instructions});
 const row={meeting_id:meeting.id,family_id:family.id,topic_key:key,decision,note,revision:(old?.revision||0)+1,task_id:taskId,task_kind:taskKind,handoff,updated_at:now()};
 c.event(family.id,`${title}: ${guidedChoices[decision]}`);
 return old?c.patch('guided_decisions',old,row):c.insert('guided_decisions',{id:uuid(),...row});
}
