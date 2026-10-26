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
 const rows=workQueue(w,now).filter(row=>{
  if(row.waiting)return false;
  if(role==='representative')return row.mine;
  if(role==='professional'){
   const id=row.target.id;const task=(row.target.kind==='execution'?w.executionTasks:w.analysisTasks).find(t=>t.id===id);
   return !!task&&w.professionals.some(p=>p.id===task.professional_id&&p.profile_id===w.profile.id)&&!row.approval;
  }
  return row.approval; // Routine execution belongs to the assigned worker, not the manager.
 });
 const actions:NextAction[]=rows.map((row:WorkItem)=>({id:row.id,familyId:row.familyId,familyName:row.familyName,title:row.title,detail:role==='admin'?`ממתין לבדיקה ולאישור. הנציג המטפל: ${row.owner}.`:role==='professional'?'פותחים את המשימה, בודקים את החומר וממשיכים מהמצב שבו נעצרתם.':'פותחים את הפריט ומטפלים בבקשה הבאה בתיק.',label:row.label,target:['family-task','followup','document'].includes(row.id.split(':')[0])?{...row.target,focus:row.id.slice(row.id.indexOf(':')+1)}:row.target,due:row.due,reason:isLate(row,now)?'מועד הטיפול עבר':row.approval?'ממתין לאישורכם':'באחריותכם'}));
 if(role==='admin'&&can(w,'families.edit'))for(const f of w.families.filter(f=>!['completed','archived'].includes(f.status)&&!w.representatives.some(r=>r.id===f.representative_id&&r.active)))actions.push({id:'unassigned:'+f.id,familyId:f.id,familyName:f.name,title:'שיוך נציג למשפחה',detail:'לתיק אין נציג פעיל שמרכז את הטיפול.',label:'לשיוך נציג',target:{page:'families',id:f.id,tab:'overview'},due:undefined,reason:'חסרה אחריות לטיפול'});
 return actions.sort((a,b)=>Number(b.id.startsWith('unassigned:'))-Number(a.id.startsWith('unassigned:'))||Number(isLate(b,now))-Number(isLate(a,now))||sortActions(a,b));
}
export function nextActions(w:Workspace,now=new Date()){return w.profile.role==='client'?clientActions(w):staffActions(w,now);}
