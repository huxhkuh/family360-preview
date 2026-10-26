import {workspaceSchema} from '../../src/lib/model';
import {Database,type Row,requireThat} from './db';
import {familyFilter,familyAccess,documentAccess,type Actor} from './auth';
const mappings:Record<string,string>={families:'families',services:'services',familyServices:'family_services',documents:'documents',analysisTasks:'analysis_tasks',executionTasks:'execution_tasks',meetings:'meetings',meetingItems:'meeting_items',professionals:'professionals',professionalServices:'professional_services',representatives:'representatives',profiles:'profiles',notifications:'notifications',timeline:'timeline_events',audit:'audit_log',automations:'automations',templates:'message_templates',documentTypes:'document_types',followUps:'meeting_followups',topicChecks:'meeting_topic_checks',familyTasks:'family_tasks',familyContacts:'family_contacts',partners:'partners',referrals:'referrals',commissionEntries:'commission_entries',finalReports:'final_reports'};
export async function workspace(db:Database,actor:Actor,familyId?:string){
 const role=actor.profile.role,staff=['admin','representative'].includes(role),filter=familyFilter(actor);if(familyId)await familyAccess(db,actor,familyId);
 const w:Row=Object.fromEntries(Object.keys(mappings).map(key=>[key,[]]));Object.assign(w,{profile:actor.profile,permissions:role==='admin'?['*']:actor.permissions,settings:{},limit:500,workflowV2Enabled:true,questionnaireV2Enabled:true,familyDirectoryEnabled:staff,activityFeedEnabled:staff,familyWorkEnabled:role!=='professional'&&role!=='marketer',resourceLibraryEnabled:true,professionalPoolEnabled:staff||role==='professional',topicChecksEnabled:staff,followUpsEnabled:true,scopedFamilyId:familyId||null});
 if(role==='marketer'){w.partners=[actor.partner];w.referrals=(await db.rows('referrals','partner_id=?',[actor.partner!.id])).map(r=>({id:r.public_id,partner_id:r.partner_id,registered_at:r.registered_at,status:r.status}));w.commissionEntries=await db.rows('commission_entries','partner_id=?',[actor.partner!.id]);return workspaceSchema.parse(w);}
 w.services=await db.rows('services',staff?'1=1':'active=1');w.documentTypes=await db.rows('document_types','active=1');
 w.notifications=await db.rows('notifications','profile_id=?',[actor.profile.id],'ORDER BY created_at DESC LIMIT 100');
 if(role==='professional'){
  w.analysisTasks=await db.rows('analysis_tasks','professional_id=?',[actor.professional!.id],'ORDER BY created_at DESC LIMIT 500');w.executionTasks=await db.rows('execution_tasks','professional_id=?',[actor.professional!.id],'ORDER BY created_at DESC LIMIT 500');
  // Full family answers and unshared files never enter a professional workspace.
  w.professionals=[{...actor.professional,name:actor.profile.name,profile_active:true}];
  w.professionalServices=await db.rows('professional_services','professional_id=?',[actor.professional!.id]);
  const candidates=(await db.statement('SELECT DISTINCT d.* FROM documents d JOIN task_documents td ON td.document_id=d.id LEFT JOIN analysis_tasks a ON a.id=td.analysis_task_id LEFT JOIN execution_tasks e ON e.id=td.execution_task_id WHERE td.revoked_at IS NULL AND ((a.professional_id=? AND a.family_id=d.family_id) OR (e.professional_id=? AND e.family_id=d.family_id))',[actor.professional!.id,actor.professional!.id]).all<Row>()).results;
  for(const row of candidates){const {consent,...doc}=await documentAccess(db,actor,row.id);w.documents.push({...doc,...(consent?{consent}:{})});}
  return workspaceSchema.parse(w);
 }
 w.families=await db.rows('families',familyId?`(${filter.sql}) AND id=?`:filter.sql,familyId?[...filter.values,familyId]:filter.values,'ORDER BY created_at DESC,id DESC LIMIT 501');
 w.familiesTruncated=w.families.length>500;w.families=w.families.slice(0,500);
 const ids=w.families.map((f:Row)=>f.id);
 for(const key of ['familyServices','documents','meetings','meetingItems','followUps','familyTasks','finalReports',...(staff?['analysisTasks','executionTasks','timeline','familyContacts']:[])])for(let i=0;i<ids.length;i+=90){const part=ids.slice(i,i+90);w[key].push(...await db.rows(mappings[key],`family_id IN (${part.map(()=>'?').join(',')})`,part));}
 w.documents=w.documents.map(({consent,...r}:Row)=>({...r,...(consent?{consent}:{})}));
 w.finalReports=w.finalReports.map((r:Row)=>({...r.content,...r,snapshot:r.snapshot}));
 for(const key of ['familyTasks','followUps'])w[key]=w[key].map((t:Row)=>({...t,owner_name:t.owner_role==='client'?'המשפחה':'הנציג'}));
 w.familyContacts=w.familyContacts.map((r:Row)=>({...r,author_name:'צוות מסודרים 360'}));
 if(staff){
  const profiles=await db.rows('profiles');const byId=new Map(profiles.map(p=>[p.id,p]));
  w.professionals=(await db.rows('professionals')).map(p=>({id:p.id,profile_id:p.profile_id,name:byId.get(p.profile_id)?.name||'',active:p.active,profile_active:!!byId.get(p.profile_id)?.active,analysis_enabled:p.analysis_enabled,execution_enabled:p.execution_enabled,business_name:p.business_name}));
  w.professionalServices=await db.rows('professional_services');
  w.representatives=(await db.rows('representatives')).map(p=>({...p,name:byId.get(p.profile_id)?.name||''}));
  if(role==='admin'){w.profiles=profiles;w.audit=await db.rows('audit_log','1=1',[],'ORDER BY created_at DESC LIMIT 200');w.templates=await db.rows('message_templates');w.automations=await db.rows('automations');w.settings=Object.fromEntries((await db.rows('system_settings')).map(r=>[r.key,r.value]));w.partners=await db.rows('partners');w.referrals=(await db.rows('referrals')).map(r=>({...r,id:r.public_id}));w.commissionEntries=await db.rows('commission_entries');}
  const meetings=w.meetings.map((m:Row)=>m.id);for(let i=0;i<meetings.length;i+=90){const part=meetings.slice(i,i+90);w.topicChecks.push(...await db.rows('meeting_topic_checks',`meeting_id IN (${part.map(()=>'?').join(',')})`,part));}
 }else{
  w.meetings=w.meetings.map(({note,cancel_reason,...m}:Row)=>m);
  w.families=w.families.map(({internal_notes,...f}:Row)=>f);
  w.familyServices=w.familyServices.map(({internal_note,professional_id,...f}:Row)=>f);
  w.meetingItems=w.meetingItems.filter((r:Row)=>r.visible_to_client).map(({representative_note,decision_note,execution_instructions,approved_actions,...r}:Row)=>r);
  const visibleItems=new Set(w.meetingItems.map((r:Row)=>r.id));
  w.followUps=w.followUps.filter((r:Row)=>r.visible_to_client&&(!r.item_id||visibleItems.has(r.item_id)));
  w.familyTasks=w.familyTasks.filter((r:Row)=>r.visible_to_client);
  w.finalReports=w.finalReports.filter((r:Row)=>r.status==='approved');
 }
 return workspaceSchema.parse(w);
}
