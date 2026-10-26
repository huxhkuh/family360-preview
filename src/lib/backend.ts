// @ts-nocheck
import {exampleAnswers,exampleComparison,exampleReportContent} from '../reports/completed-example';
import {comparisonFinancial} from '../meetings/comparison';
import {createGrowthStore,growthProjection,registerReferral} from '../growth/referrals';
import {reportOperation} from '../reports/report-operations';
import {telephoneOperation} from '../growth/telephone-operations';
import {growthOperation} from '../growth/growth-operations';

import {questionnaireDiscussion} from "../families/questionnaire-discussion";
// This module intentionally replaces the production backend in the demo repository.
// No network, persistence, credentials or production service initialization.
import type {SupabaseClient} from '@supabase/supabase-js';
import seed from './demo-seed';
import {registrationSchema} from '../customer/registration';
import {questionnaireIssues} from '../families/questionnaire-validation';
import {operationRpc} from './demo-operations';
import {meetingRpc} from './demo-meeting';
import {documentPreparation} from '../companion/document-preparation';
import {clearinghouseConsent} from '../families/clearinghouse-consent';
import {workspaceSchema,type Role} from './model';
const initial=structuredClone(seed);
let state:any;
let growth=createGrowthStore();
let role:Role='representative';
const now=()=>new Date().toISOString();
const id=()=>crypto.randomUUID();
export function resetDemo(){
 growth=createGrowthStore();
 state=structuredClone(initial);
 state.finalReports=[];state.finalReportHistory=[];
 Object.assign(state,{workflowV2Enabled:true,questionnaireV2Enabled:true,familyWorkEnabled:true,familyDirectoryEnabled:true,activityFeedEnabled:true,resourceLibraryEnabled:true,professionalPoolEnabled:true,familyTasks:[],familyContacts:[]});
 state.families.forEach(f=>{f.representative_id='rep1';f.phone='';f.email='family@example.invalid';});
 state.professionals=[1,2,3].map(n=>({id:'pro'+n,profile_id:'professional'+n,name:['מומחה א׳ לדוגמה','מומחה ב׳ לדוגמה','מומחה ג׳ לדוגמה'][n-1],active:true,profile_active:true,analysis_enabled:true,execution_enabled:true,business_name:'משרד לדוגמה'}));
 state.professionalServices=state.professionals.flatMap(p=>state.services.map(s=>({id:p.id+s.id,professional_id:p.id,service_id:s.id,analysis_enabled:true,execution_enabled:true})));
 state.representatives=[{id:'rep1',profile_id:'representative',name:'נציג לדוגמה',active:true,permissions:['families.edit','documents.manage','analysis.send','analysis.approve','execution.send','execution.approve']}];
 state.profiles=[{id:'admin',name:'מנהל לדוגמה',role:'admin',active:true},{id:'client',name:'לקוח לדוגמה',role:'client',active:true},{id:'representative',name:'נציג לדוגמה',role:'representative',active:true},...state.professionals.map(p=>({id:p.profile_id,name:p.name,role:'professional',active:true}))];
 state.familyTasks=[{id:'ft1',family_id:'f1',title:'להכין רשימת הוצאות חודשית',details:'דוגמה למשימה בתיק שאינה תלויה בפגישה.',owner_role:'client',owner_name:'המשפחה',due_on:new Date(Date.now()+86400000*4).toISOString().slice(0,10),visible_to_client:true,status:'open',revision:1,updated_at:now()}];
 state.documents.push({id:'d1',family_id:'f1',document_type_id:'dt1',name:'דוח חיסכון עדכני — דוגמה בלבד',key:'pension_report',type:'file',status:'missing',purpose:'להכין את בירור החסכונות שסוכם בשיחה לדוגמה.',subject:'בעל החיסכון שעליו דובר בשיחה',period:'הדוח העדכני הזמין',source_hint:'באזור האישי של הגוף שמנהל את החיסכון. בדמו מצרפים דוגמה מדומה בלבד.'});
 state.followUps.find(t=>t.id==='fu1').document_id='d1';
 state.familyContacts=[{id:'fc1',family_id:'f1',kind:'phone',summary:'שיחת היכרות לדוגמה: תואם איסוף מסמכים לקראת המשך הבדיקה.',occurred_at:now(),author_name:'נציג לדוגמה',next_task_id:'ft1'}];
 state.resources=[{id:'resource1',title:'פריט לדוגמה בספרייה',description:'טיוטה להמחשת עריכת פרטי קשר. אין כאן המלצה או מקור שנבדק.',url:'https://example.com',phone:'',chapter:'general',active:false,verified_at:null,revision:1}];
 state.offers=[{id:'offer1',family_service_id:'fs2',kind:'analysis',service_name:'פנסיה וחסכונות',candidates:['pro1','pro2'],status:'open',created_at:now(),expires_at:new Date(Date.now()+86400000*2).toISOString(),claimed_by:null}];
 state.executionTasks=[{id:'e1',family_id:'f1',family_service_id:'fs1',service_id:'s2',professional_id:'pro1',task_number:'E-001',status:'sent_execution',instructions:'לבדוק את פרטי המסלול שאושר ולתעד את תוצאות הטיפול. דוגמה בלבד.',client_name:'לקוח לדוגמה',client_phone:'0500000000',due_at:new Date(Date.now()+86400000*3).toISOString()}];
 state.familyServices.push({id:'fs1',family_id:'f1',service_id:'s2',status:'sent_execution',analysis_task_id:null,execution_task_id:'e1'});
 state.executionHistory={};state.settings={system_name:'מסודרים 360'};
 state.templates=[{id:'template1',key:'demo_update',name:'עדכון טיפול לדוגמה',subject:'עדכון בתיק המשפחה',body:'שלום, התקבל עדכון בתיק. זהו נוסח לדוגמה בלבד.',active:true}];
 state.automations=[{id:'automation1',key:'demo_reminder',name:'תזכורת מעקב לדוגמה',active:false,channel:'in_app'}];
 state.notifications=[{id:'notice1',title:'ברוכים הבאים לדמו',body:'הנתונים והפעולות כאן הם להמחשה בלבד. אפשר לאפס את הדמו בכל עת.',read_at:null}];
}
resetDemo();
export function startClientIntake(code?:string){
 const retainedGrowth=growth;resetDemo();growth=retainedGrowth;
 Object.assign(state.families.find(f=>f.id==='f1'),{status:'new',onboarding_pct:0,answers:{},contact_name:'לקוח לדוגמה',phone:'0500000000'});
 for(const key of ['familyServices','documents','meetings','meetingItems','followUps','familyTasks','familyContacts','executionTasks'])state[key]=state[key].filter(x=>x.family_id!=='f1');
 if(code)registerReferral(growth,code,'f1');
}
export function registerClientIntake(input:unknown,code?:string){
 const account=registrationSchema.parse(input);startClientIntake(code);
 const family=state.families.find(f=>f.id==='f1'),name=account.first+' '+account.last;
 Object.assign(family,{name:'משפחת '+account.last,contact_name:name,email:account.email,phone:account.phone,answers:{h_first:account.first,h_last:account.last,h_email:account.email,h_phone:account.phone}});
 Object.assign(state.profiles.find(p=>p.id==='client'),{name,email:account.email});
 return account;
}
export function loadCompletedFamilyExample(){
 startClientIntake();selectRole('representative');const at=now();const family=state.families.find(f=>f.id==='f1');
 Object.assign(family,{name:'משפחת לדוגמה',answers:structuredClone(exampleAnswers),contact_name:'ישראל לדוגמה',phone:'0500000000',email:'demo@example.invalid',onboarding_pct:100,status:'meeting_done'});
 const fsId='example-service',analysisId='example-analysis',executionId='example-execution',meetingId='example-meeting';
 state.familyServices.push({id:fsId,family_id:'f1',service_id:'s2',status:'completed',analysis_task_id:analysisId,execution_task_id:executionId});
 state.analysisTasks.push({id:analysisId,family_id:'f1',family_service_id:fsId,service_id:'s2',professional_id:'pro1',task_number:'A-EXAMPLE',status:'approved',financial:comparisonFinancial({},exampleComparison),current_situation:exampleComparison.current_detail,recommendation:exampleComparison.proposed_detail,client_summary:'הוצעה חלופה של 25 ₪ לחודש, בכפוף לתנאים. בדוגמה זו הצעה בלבד.',result_tone:'yellow',internal_note:'תיעוד פנימי לדוגמה — אינו חלק מהדוח ללקוח.'});
 state.executionTasks.push({id:executionId,family_id:'f1',family_service_id:fsId,service_id:'s2',professional_id:'pro1',task_number:'E-EXAMPLE',status:'completed',instructions:'לבצע רק את המסלול שהמשפחה אישרה ולבדוק חיוב חדש וזיכוי.',outcome_summary:'דיווח מדומה: בוצע מסלול של 30 ₪ לחודש והתקבל זיכוי חד־פעמי של 120 ₪. ההצעה ל־25 ₪ לא מומשה.'});
 state.executionHistory[executionId]={messages:[],updates:[{id:id(),text:'דיווח ביצוע מדומה: חיוב מעודכן 30 ₪ וזיכוי 120 ₪; הנציג בדק ואישר.'}]};
 state.meetings.push({id:meetingId,family_id:'f1',status:'completed',scheduled_at:at,type:'phone'});
 state.meetingItems.push({id:'example-item',meeting_id:meetingId,family_id:'f1',family_service_id:fsId,title:'בדיקת עמלות הבנק',client_summary:'המשפחה אישרה מסלול בעלות 30 ₪ לחודש. הצעת 25 ₪ לא התאימה לתנאים בדוגמה.',client_decision:'progress',visible_to_client:true,sort_order:1,financial:comparisonFinancial({},exampleComparison),current_situation:exampleComparison.current_detail,recommendation:exampleComparison.proposed_detail,decision_note:'תועד אישור למסלול של 30 ₪; זה שונה מהחלופה המקורית.',execution_instructions:'החלופה שאושרה היא 30 ₪ לחודש, עם בדיקת זיכוי.'});
 for(const [suffix,name] of [['a','מסמך הדגמה א׳ — חיוב ישן 85 ₪'],['b','הצעה מדומה ב׳ — 25 ₪ בכפוף לתנאים'],['c','אישור הדגמה ג׳ — חיוב חדש 30 ₪'],['d','אישור הדגמה ד׳ — זיכוי 120 ₪']])state.documents.push({id:'example-doc-'+suffix,family_id:'f1',name,key:'example_'+suffix,type:'file',status:'approved',file_name:'מקור מדומה בלבד — לא הועלה קובץ',purpose:'המחשת מקור נתון בלבד, ללא מסמך אמיתי.'});
 state.familyContacts.push({id:'example-contact',family_id:'f1',kind:'meeting',summary:'המשפחה ביקשה להפחית עמלות ולהבין את החיוב. הנציג הסביר את ההצעה ואת המסלול שנבחר.',occurred_at:at,author_name:'נציג לדוגמה',next_task_id:null});
 state.familyTasks.push({id:'example-verification',family_id:'f1',title:'לבדוק את החיוב המעודכן ואת הזיכוי',details:'בדיקה מדומה לצורך המחשת סיום התהליך.',owner_role:'representative',owner_name:'נציג לדוגמה',due_on:at.slice(0,10),visible_to_client:true,status:'completed',revision:1,updated_at:at});
 reportOperation('rpc_save_final_report',{p_meeting_id:meetingId,p_expected_revision:0,p_content:structuredClone(exampleReportContent)},state,'representative');
 reportOperation('rpc_approve_final_report',{p_meeting_id:meetingId,p_expected_revision:1,p_treatment_complete:true,p_reviewed:true},state,'representative');
 return meetingId;
}
export function selectRole(next:Role){role=next;}
function workspace(){
 const data=structuredClone(state);
 Object.assign(data,growthProjection(growth,role,state.families));
 if(role==='marketer'){
  data.familyDirectoryEnabled=false;
  for(const key of ['finalReports','families','services','familyServices','documents','analysisTasks','executionTasks','meetings','meetingItems','followUps','familyTasks','familyContacts','timeline','notifications','profiles','professionals','professionalServices','representatives','audit','templates','automations','documentTypes','topicChecks','resources','offers'])data[key]=[];
  data.settings={system_name:state.settings.system_name};
 }
 const profileId=role==='professional'?'professional1':role;
 data.notifications=data.notifications.filter(n=>!n.audience||n.audience===role||role==='admin'&&n.audience==='representative').filter(n=>role!=='client'||!n.family_id||n.family_id==='f1');
 if(role==='client'){
  data.finalReports=data.finalReports.filter(r=>r.family_id==='f1'&&r.status==='approved');
  data.families=data.families.filter(f=>f.id==='f1').map(({internal_notes,questionnaire_reviews,...f})=>f);
  for(const key of ['documents','familyServices','meetings','meetingItems','followUps','familyTasks'])data[key]=data[key].filter(x=>x.family_id==='f1');
  data.followUps=data.followUps.filter(t=>t.visible_to_client);data.familyTasks=data.familyTasks.filter(t=>t.visible_to_client);
  data.meetingItems=data.meetingItems.filter(i=>i.visible_to_client).map(({decision_note,execution_instructions,approved_actions,...i})=>i);
  data.analysisTasks=[];data.executionTasks=[];data.timeline=[];data.familyContacts=[];data.topicChecks=[];data.topicChecksEnabled=false;
 }
 if(role==='professional'){
  data.finalReports=[];
  data.analysisTasks=data.analysisTasks.filter(t=>t.professional_id==='pro1');data.executionTasks=data.executionTasks.filter(t=>t.professional_id==='pro1');
  data.families=[];data.familyServices=[];data.documents=[];data.meetings=[];data.meetingItems=[];data.followUps=[];data.familyTasks=[];data.familyContacts=[];data.timeline=[];
 }
 if(role!=='admin'){data.profiles=[];data.audit=[];}
 return workspaceSchema.parse({...data,profile:{id:profileId,name:({client:state.profiles.find(p=>p.id==='client')?.name||'לקוח לדוגמה',representative:'נציג לדוגמה',professional:'מומחה א׳ לדוגמה',admin:'מנהל לדוגמה',marketer:'משווק לדוגמה'})[role],email:role==='client'?state.profiles.find(p=>p.id==='client')?.email:undefined,role,active:true},permissions:role==='admin'?['*']:role==='representative'?state.representatives[0].permissions:[]});
}
export async function loadWorkspace(familyId?:string){const w=workspace();if(familyId&&w.families.some(f=>f.id===familyId))w.scopedFamilyId=familyId;return w;}
export class WorkspaceNetworkError extends Error{}
export const configError=null;
const listeners=new Set<any>();
const session=()=>({access_token:'demo-'+role,user:{id:role},expires_at:Math.floor(Date.now()/1000)+86400});
const channel={on(){return channel;},subscribe(){return channel;}};
const unavailable=async()=>({data:null,error:new Error('DEMO_UNAVAILABLE')});
export const backend={auth:{getSession:async()=>({data:{session:session()},error:null}),onAuthStateChange:(cb)=>{listeners.add(cb);return {data:{subscription:{unsubscribe:()=>listeners.delete(cb)}}};},signOut:async()=>{location.reload();return {error:null};},signInWithPassword:unavailable,signUp:unavailable,resetPasswordForEmail:unavailable,updateUser:unavailable,mfa:{listFactors:unavailable,enroll:unavailable,challengeAndVerify:unavailable}},channel:()=>channel,removeChannel:()=>{}} as unknown as SupabaseClient;
const find=(key:string,value:string)=>{const row=state[key].find(x=>x.id===value);if(!row)throw Error('VALIDATION');return row;};
function update(key:string,identifier:string,patch:any,expected?:number){const old=state[key].find(x=>x.id===identifier);if(old&&expected!=null&&old.revision!==expected)throw Error('CONFLICT');const row={...old,...patch,id:identifier,revision:(old?.revision||0)+1,updated_at:now()};if(old)Object.assign(old,row);else state[key].push(row);return row;}
function assign(serviceId:string,kind:string,professionalId:string){const fs=find('familyServices',serviceId);const task={id:id(),family_id:fs.family_id,family_service_id:fs.id,service_id:fs.service_id,professional_id:professionalId,task_number:'DEMO-'+(state.analysisTasks.length+state.executionTasks.length+1),status:kind==='analysis'?'assigned':'sent_execution',due_at:new Date(Date.now()+86400000*3).toISOString()};state[kind==='analysis'?'analysisTasks':'executionTasks'].push(task);fs[kind+'_task_id']=task.id;fs.status=kind==='analysis'?'in_analysis':'sent_execution';return task.id;}
export async function rpc<T=unknown>(name:string,a:Record<string,any>={}):Promise<T>{
 const run=()=>{
 if(role==='marketer')throw Error('PERMISSION_DENIED');
 const growthResult=growthOperation(name,a,growth,role);if(growthResult!==undefined)return growthResult;
 const reportResult=reportOperation(name,a,state,role);if(reportResult!==undefined)return reportResult;
 const phoneResult=telephoneOperation(name,a,state,role);if(phoneResult!==undefined)return phoneResult;
 const operation=operationRpc(name,a,state,role);if(operation!==undefined)return operation;
 const staff=role==='admin'||role==='representative';
 if(name==='rpc_sign_document'){
  const doc=find('documents',a.p_document_id);
  if(role!=='client'||doc.family_id!=='f1')throw Error('PERMISSION_DENIED');
  if(doc.type!=='signature'||!/^clearinghouse_auth_[hw]$/.test(doc.key)||doc.status==='signed')throw Error('INVALID_STATE');
  const signer=String(a.p_signer||'').trim();
  if(a.p_consent!==true||signer.length<2||signer.length>150||a.p_version!==clearinghouseConsent.version||a.p_text!==clearinghouseConsent.text)throw Error('VALIDATION');
  doc.consent={...clearinghouseConsent,signer,signed_at:now()};doc.status='signed';
  state.timeline.push({id:id(),family_id:doc.family_id,title:'תועדה חתימה לדוגמה על הרשאה למסלקה',created_at:doc.consent.signed_at});
  return doc;
 }
 if(name==='rpc_review_questionnaire_topic'){
  if(!staff)throw Error('PERMISSION_DENIED');
  const f=find('families',a.p_family_id);
  if(a.p_expected_updated_at!==f.updated_at)throw Error('CONFLICT');
  const topic=questionnaireDiscussion(f.answers||{}).find(t=>t.key===a.p_key);
  if(!topic||topic.token!==a.p_token)throw Error('CONFLICT');
  const note=String(a.p_note||'').trim();if(note.length<3||note.length>1000)throw Error('VALIDATION');
  f.questionnaire_reviews={...f.questionnaire_reviews,[topic.key]:{token:topic.token,note}};
  f.updated_at=new Date(Math.max(Date.now(),Date.parse(f.updated_at||0)+1)).toISOString();return null;
 }
 if(name==='rpc_demo_prepare_document'){
  if(!staff&&!(role==='client'&&a.p_family_id==='f1'))throw Error('PERMISSION_DENIED');
  const family=find('families',a.p_family_id);
  const preparation=documentPreparation(family.answers||{}).find(p=>p.key===a.p_key);
  if(!preparation)throw Error('VALIDATION');
  let doc=state.documents.find(d=>d.family_id===family.id&&d.key===preparation.key);
  if(doc&&doc.type!==(preparation.type||'file'))throw Error('VALIDATION');
  if(!doc){doc={id:id(),family_id:family.id,name:preparation.name+' — דוגמה בלבד',key:preparation.key,type:preparation.type||'file',optional:true,status:'missing',purpose:preparation.reason,source_hint:preparation.source,period:preparation.period};state.documents.push(doc);}
  if(doc.type==='file'&&['missing','rejected'].includes(doc.status))Object.assign(doc,{status:'pending',file_name:'דוגמה מדומה — לא הועלה קובץ',reject_reason:null});
  return doc;
 }
 if(name==='rpc_search_families'){const q=String(a.p_query||'').trim().toLowerCase();return {items:workspace().families.filter(f=>[f.name,f.case_number,f.contact_name,f.phone,f.email].some(v=>v?.toLowerCase().includes(q))),next:null};}
 if(name==='rpc_family_activity'){if(!staff)throw Error('PERMISSION_DENIED');const items=[...state.timeline.filter(r=>r.family_id===a.p_family_id).map(r=>({key:r.id,at:r.created_at,kind:'event',title:r.title,detail:'',author:'',target:'overview'})),...state.familyContacts.filter(r=>r.family_id===a.p_family_id).map(r=>({key:r.id,at:r.occurred_at,kind:'contact',title:'קשר עם המשפחה',detail:r.summary,author:r.author_name,target:'overview'})),...[...state.familyTasks,...state.followUps].filter(r=>r.family_id===a.p_family_id).map(r=>({key:r.id,at:r.updated_at,kind:'task',title:r.title,detail:r.details,author:r.owner_name,target:'followups'}))].filter(r=>a.p_kind==='all'||r.kind===a.p_kind).sort((a,b)=>b.at.localeCompare(a.at));return {items,next:null};}
 if(name==='rpc_list_resources')return state.resources.filter(r=>a.p_manage&&role==='admin'||r.active&&r.verified_at);
 if(name==='rpc_save_resource'){if(role!=='admin')throw Error('PERMISSION_DENIED');return update('resources',a.p_id,{...a.p_payload,verified_at:a.p_payload.verified?now():null},a.p_expected_revision);}
 if(name==='rpc_list_professional_offers')return state.offers.filter(o=>role==='professional'?o.status==='open'&&o.candidates.includes('pro1'):!a.p_family_service_id||o.family_service_id===a.p_family_service_id).map(o=>role==='professional'?{id:o.id,kind:o.kind,service_name:o.service_name,status:o.status,created_at:o.created_at,expires_at:o.expires_at}:o);
 if(name==='rpc_claim_professional_offer'){const o=find('offers',a.p_id);if(role!=='professional'||o.status!=='open'||!o.candidates.includes('pro1'))throw Error('CONFLICT');const task=assign(o.family_service_id,o.kind,'pro1');o.status='claimed';o.claimed_by='pro1';return task;}
 if(name==='rpc_create_professional_offer'){if(!staff)throw Error('PERMISSION_DENIED');const fs=find('familyServices',a.p_family_service_id);if(state.offers.some(o=>o.family_service_id===fs.id&&o.status==='open'))throw Error('CONFLICT');const row={id:a.p_id,family_service_id:fs.id,kind:a.p_kind,candidates:a.p_candidates,service_name:find('services',fs.service_id).name,status:'open',created_at:now(),expires_at:new Date(Date.now()+86400000*2).toISOString()};state.offers.push(row);return row;}
 if(name==='rpc_cancel_professional_offer'){if(!staff)throw Error('PERMISSION_DENIED');find('offers',a.p_id).status='cancelled';return null;}
 if(name==='rpc_mark_notifications_read'){const visible=new Set(workspace().notifications.map(n=>n.id));state.notifications.filter(n=>visible.has(n.id)).forEach(n=>n.read_at=now());return null;}
 if(name==='rpc_save_family_task'){if(!staff)throw Error('PERMISSION_DENIED');if(a.p_payload.document_id&&!state.documents.some(d=>d.id===a.p_payload.document_id&&d.family_id===a.p_family_id))throw Error('VALIDATION');return update('familyTasks',a.p_id,{...a.p_payload,family_id:a.p_family_id,status:state.familyTasks.find(t=>t.id===a.p_id)?.status||'open',owner_name:a.p_payload.owner_role==='client'?'המשפחה':'נציג לדוגמה'},a.p_expected_revision);}
 if(name==='rpc_record_family_contact'){if(!staff)throw Error('PERMISSION_DENIED');update('familyContacts',a.p_id,{family_id:a.p_family_id,kind:a.p_kind,summary:a.p_summary,occurred_at:a.p_occurred_at,author_name:'נציג לדוגמה',next_task_id:a.p_next_task_id||null});if(a.p_next_task)update('familyTasks',a.p_next_task_id,{...a.p_next_task,family_id:a.p_family_id,status:'open',owner_name:a.p_next_task.owner_role==='client'?'המשפחה':'נציג לדוגמה'});return null;}
 if(name==='rpc_set_family_task_status'){const t=find('familyTasks',a.p_id);if(!staff&&!(role==='client'&&t.family_id==='f1'&&t.owner_role==='client'&&t.visible_to_client))throw Error('PERMISSION_DENIED');if(!['open','in_progress','completed','cancelled'].includes(a.p_status))throw Error('VALIDATION');if(!staff&&(!['open','in_progress'].includes(t.status)||!['in_progress','completed'].includes(a.p_status)))throw Error('PERMISSION_DENIED');if(a.p_status==='completed'&&t.document_id&&!state.documents.some(d=>d.id===t.document_id&&d.family_id===t.family_id&&['pending','approved','signed'].includes(d.status)))throw Error('VALIDATION');return update('familyTasks',a.p_id,{status:a.p_status},a.p_expected_revision);}
 if(name==='rpc_client_request'){
  if(role!=='client'||a.p_family_id!=='f1')throw Error('PERMISSION_DENIED');
  const f=find('families',a.p_family_id);if(!['help','correction'].includes(a.p_kind))throw Error('VALIDATION');
  let source;const details=String(a.p_details||'').trim();
  if(a.p_kind==='correction'){
   if(!['familyTask','followUp'].includes(a.p_source_kind))throw Error('VALIDATION');
   source=find(a.p_source_kind==='familyTask'?'familyTasks':'followUps',a.p_source_id);
   if(source.family_id!==f.id||source.owner_role!=='client'||!source.visible_to_client||source.item_id&&!state.meetingItems.some(i=>i.id===source.item_id&&i.visible_to_client))throw Error('PERMISSION_DENIED');
   if(source.revision!==a.p_expected_revision)throw Error('CONFLICT');
   if(source.status!=='completed')throw Error('VALIDATION');
  }else if(details.length<3||details.length>1000)throw Error('VALIDATION');
  const existing=state.familyTasks.find(t=>t.family_id===f.id&&t.request_kind===a.p_kind&&t.source_id===source?.id&&['open','in_progress'].includes(t.status));if(existing)return existing;
  const request=update('familyTasks',id(),{family_id:f.id,title:source?'בקשה לתיקון: '+source.title:'בקשת עזרה מהמשפחה',details:source?'המשפחה ביקשה לבדוק סימון כהושלם. יש לברר לפני פתיחת המשימה מחדש.':details,owner_role:'representative',owner_name:state.representatives.find(r=>r.id===f.representative_id)?.name||'הנציג המטפל',visible_to_client:true,due_on:'',status:'open',request_kind:a.p_kind,source_id:source?.id,source_kind:source?a.p_source_kind:undefined});state.notifications.push({id:id(),title:request.title,body:'נרשמה בקשה מהמשפחה במעקב הדמו.',read_at:null,audience:'representative',family_id:f.id,target_kind:'familyTask',target_id:request.id});return request;
 }
 if(name==='rpc_complete_onboarding'){if(!staff&&!(role==='client'&&a.p_family_id==='f1'))throw Error('PERMISSION_DENIED');const f=find('families',a.p_family_id);if(f.onboarding_pct===100)return null;if(questionnaireIssues(f.answers||{},state.services).length)throw Error('VALIDATION');Object.assign(f,{onboarding_pct:100,status:'waiting_review'});return null;}
 if(name==='rpc_demo_attach_example'){const doc=find('documents',a.p_document_id);if(!staff&&!(role==='client'&&doc.family_id==='f1'))throw Error('PERMISSION_DENIED');if(doc.type!=='file'||!['missing','rejected'].includes(doc.status))throw Error('VALIDATION');Object.assign(doc,{status:'pending',file_name:'דוגמה מדומה — לא הועלה קובץ',reject_reason:null});return null;}
 if(name==='rpc_review_document'){if(!staff)throw Error('PERMISSION_DENIED');const doc=find('documents',a.p_document_id);if(doc.status!=='pending')throw Error('VALIDATION');if(!a.p_approved&&!String(a.p_reason||'').trim())throw Error('VALIDATION');Object.assign(doc,{status:a.p_approved?'approved':'rejected',reject_reason:a.p_reason||null});state.notifications.push({id:id(),title:a.p_approved?'המסמך אושר':'נדרש תיקון במסמך',body:doc.name,read_at:null,audience:'client',family_id:doc.family_id,target_kind:'document',target_id:doc.id});return null;}
 if(name==='rpc_request_document'){if(!staff)throw Error('PERMISSION_DENIED');const type=find('documentTypes',a.p_type_id);state.documents.push({id:id(),family_id:a.p_family_id,document_type_id:type.id,name:type.name,key:type.key,type:type.type,status:'missing',...Object.fromEntries(['purpose','subject','period','source_hint'].map(key=>[key,String(a['p_'+key]||'').trim().slice(0,500)]))});return null;}
 if(name==='rpc_add_family_service'){if(!staff)throw Error('PERMISSION_DENIED');state.familyServices.push({id:id(),family_id:a.p_family_id,service_id:a.p_service_id,status:'waiting_analysis',analysis_task_id:null,execution_task_id:null});return null;}
 if(name==='rpc_assign_analysis'||name==='rpc_assign_execution'){if(!staff)throw Error('PERMISSION_DENIED');return assign(a.p_family_service_id,name.endsWith('analysis')?'analysis':'execution',a.p_professional_id);}
 if(name==='rpc_manage_meeting'){if(!staff)throw Error('PERMISSION_DENIED');const m=find('meetings',a.p_meeting_id);if(m.scheduled_at!==a.p_expected_scheduled_at)throw Error('CONFLICT');if(a.p_action==='reschedule')m.scheduled_at=a.p_scheduled_at;else m.status='cancelled';return null;}
 if(name==='rpc_save_decision_followup'){if(!staff)throw Error('PERMISSION_DENIED');const item=find('meetingItems',a.p_item_id);Object.assign(item,{client_decision:a.p_decision,decision_note:a.p_note,execution_instructions:a.p_instructions});return update('followUps',a.p_followup_id,{...a.p_followup,meeting_id:a.p_meeting_id,item_id:a.p_item_id,family_id:item.family_id,status:'open',owner_name:'נציג לדוגמה'},a.p_expected_revision);}
 if(name==='rpc_list_agent_invitations')return [];
 const legacy=meetingRpc('/rest/v1/rpc/'+name,a,state,role,workspace);if(legacy!==undefined)return legacy;
 throw Error('DEMO_UNAVAILABLE');
 };return structuredClone(run()) as T;
}
export async function uploadDocument(_familyId:string,_documentId:string,_file:File):Promise<void>{throw Error('DEMO_UNAVAILABLE');}
export async function documentUrl(_path:string):Promise<string>{throw Error('DEMO_UNAVAILABLE');}
