import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {workQueue,isLate,type WorkItem} from '../lib/work-queue';
import {clientIntake} from '../lib/client-intake';
export type NextAction={id:string;familyId?:string;familyName?:string;title:string;detail:string;label:string;target:RouteState;due?:string;reason:string};
const sortActions=(a:NextAction,b:NextAction)=> (a.due||'9999').localeCompare(b.due||'9999')||a.id.localeCompare(b.id);
const can=(w:Workspace,p:string)=>w.permissions.includes('*')||w.permissions.includes(p);
export function clientActions(w:Workspace):NextAction[]{
 const actions:NextAction[]=[];
 for(const f of w.families){
  if(['completed','archived'].includes(f.status))continue;
  const base={familyId:f.id,familyName:f.name};
  const target=(tab:string,focus?:string):RouteState=>({page:'families',id:f.id,tab,focus});
  if(f.onboarding_pct!==100){const intake=clientIntake(f,w);actions.push({...base,id:'intake:'+f.id,title:intake.action.title,detail:'כדאי לפנות כחצי שעה. ממלאים פרק אחד בכל פעם, ואפשר לשמור ולהמשיך מאוחר יותר.',label:intake.action.label,target:target('questionnaire'),reason:'היכרות לפני תחילת הבדיקה'});continue;}
  const tasks=[...w.familyTasks,...w.followUps.filter(t=>!t.item_id||w.meetingItems.some(i=>i.id===t.item_id&&i.visible_to_client))].filter(t=>t.family_id===f.id&&t.visible_to_client&&t.owner_role==='client'&&['open','in_progress'].includes(t.status));
  const linked=new Set<string>();
  for(const t of tasks){const doc=w.documents.find(d=>d.id===t.document_id&&d.family_id===f.id);if(doc)linked.add(doc.id);const attach=doc&&['missing','rejected'].includes(doc.status);actions.push({...base,id:'client-task:'+t.id,title:t.title,detail:t.details,label:attach?'לצירוף המסמך':'לפרטי הפעולה ולעדכון',target:target(attach?'documents':'followups',attach?doc.id:t.id),due:t.due_on,reason:attach?'המסמך נחוץ להמשך הטיפול':'בקשה מהנציג שלכם'});}
  for(const d of w.documents.filter(d=>d.family_id===f.id&&!d.optional&&!linked.has(d.id)&&['missing','rejected'].includes(d.status)))actions.push({...base,id:'document:'+d.id,title:d.name,detail:d.reject_reason||d.purpose||'הנציג ביקש להשלים את הפריט כדי להמשיך בטיפול.',label:'להשלמת הבקשה',target:target('documents',d.id),reason:'מסמך שנדרש מכם'});
 }
 return actions.sort(sortActions);
}
export function staffActions(w:Workspace,now=new Date()):NextAction[]{
 const role=w.profile.role;
 if(!['representative','professional','admin'].includes(role))return [];
 if(role==='professional'){
  const ownIds=new Set(w.professionals.filter(p=>p.profile_id===w.profile.id&&p.active&&p.profile_active).map(p=>p.id));
  return ([['analysis',w.analysisTasks],['execution',w.executionTasks]] as const).flatMap(([kind,tasks])=>tasks.filter(t=>ownIds.has(t.professional_id)&&(kind==='analysis'?['assigned','in_progress','returned']:['sent_execution','execution_in_progress','needs_info']).includes(t.status)).map(t=>({id:kind+':'+t.id,title:(kind==='analysis'?'בדיקה מקצועית':'ביצוע')+' — '+(w.services.find(s=>s.id===t.service_id)?.name||t.task_number),detail:'פותחים את החומר שהועבר למשימה, מתעדים את העבודה ושולחים לבדיקה כשהיא מוכנה.',familyId:t.family_id,familyName:w.families.find(f=>f.id===t.family_id)?.name,label:'פתיחת המשימה',target:{page:'tasks',kind,id:t.id,focus:t.id} as RouteState,due:t.due_at||undefined,reason:isLate({due:t.due_at||undefined},now)?'מועד הטיפול עבר':'באחריותך'}))).sort((a,b)=>Number(isLate(b,now))-Number(isLate(a,now))||sortActions(a,b));
 }

 const rows=workQueue(w,now).filter(row=>{
  if(row.waiting)return false;
  if(role==='representative')return row.mine;
  return row.approval; // Routine execution belongs to the assigned worker, not the manager.
 });
 const actions:NextAction[]=rows.map((row:WorkItem)=>({id:row.id,familyId:row.familyId,familyName:row.familyName,title:row.title,detail:role==='admin'?`ממתין לבדיקה ולאישור. הנציג המטפל: ${row.owner}.`:'פותחים את הפריט ומטפלים בבקשה הבאה בתיק.',label:row.label,target:{...row.target,focus:row.id.startsWith('analysis:')&&row.target.page==='families'?w.analysisTasks.find(t=>t.id===row.id.slice(9))?.family_service_id:row.id.slice(row.id.indexOf(':')+1)},due:row.due,reason:isLate(row,now)?'מועד הטיפול עבר':row.approval?'ממתין לאישורכם':'באחריותכם'}));
 if(role==='admin'&&can(w,'families.edit'))for(const f of w.families.filter(f=>!['completed','archived'].includes(f.status)&&!w.representatives.some(r=>r.id===f.representative_id&&r.active)))actions.push({id:'unassigned:'+f.id,familyId:f.id,familyName:f.name,title:'שיוך נציג למשפחה',detail:'לתיק אין נציג פעיל שמרכז את הטיפול.',label:'לשיוך נציג',target:{page:'families',id:f.id,tab:'overview',focus:'assignment'},due:undefined,reason:'חסרה אחריות לטיפול'});
 return actions.sort((a,b)=>Number(b.id.startsWith('unassigned:'))-Number(a.id.startsWith('unassigned:'))||Number(isLate(b,now))-Number(isLate(a,now))||sortActions(a,b));
}
export function nextActions(w:Workspace,now=new Date()){return w.profile.role==='client'?clientActions(w):staffActions(w,now);}
