import {reportReadiness} from '../reports/report-data';
import type {Workspace} from './model';
import type {RouteState} from './navigation';
export type WorkItem={id:string;familyId:string;familyName:string;title:string;owner:string;mine:boolean;waiting:boolean;approval:boolean;due?:string;target:RouteState;label:string};
export const workFilters=[['all','הכול'],['mine','שלי'],['today','היום'],['late','באיחור'],['approval','ממתינים לאישור'],['waiting','ממתינים לאחרים']] as const;
export const israelDay=(date=new Date())=>date.toLocaleDateString('sv-SE',{timeZone:'Asia/Jerusalem'});
export function isLate(item:WorkItem,now=new Date()){return !!item.due&&(item.due.length===10?item.due<israelDay(now):Date.parse(item.due)<now.getTime());}
export function workQueue(w:Workspace,now=new Date()):WorkItem[]{
 const rows:WorkItem[]=[];const staff=['admin','representative'].includes(w.profile.role);
 const can=(p:string)=>w.permissions.includes('*')||w.permissions.includes(p);
 for(const f of w.families){
  const rep=w.representatives.find(r=>r.id===f.representative_id);const mine=rep?.profile_id===w.profile.id;
  const add=(item:Omit<WorkItem,'familyId'|'familyName'>)=>rows.push({...item,familyId:f.id,familyName:f.name});
  const familyTarget=(tab:string):RouteState=>({page:'families',id:f.id,tab});
  for(const t of w.familyTasks.filter(t=>t.family_id===f.id&&['open','in_progress'].includes(t.status))){
   const client=w.profile.role==='client';if(!staff&&(!client||!t.visible_to_client))continue;
   const owns=t.owner_role==='client'?client:staff&&mine&&can('families.edit');
   add({id:'family-task:'+t.id,title:t.title,owner:t.owner_name,mine:owns,waiting:t.owner_role==='client'?!client:!staff||!can('families.edit'),approval:false,due:t.due_on,target:familyTarget('followups'),label:'לפעולות בתיק'});
  }
  if(staff){
   if((f.onboarding_pct??0)<100&&f.status==='new')add({id:'onboarding:'+f.id,title:'השלמת השאלון',owner:'המשפחה',mine:false,waiting:true,approval:false,target:familyTarget('questionnaire'),label:'לשאלון המשפחה'});
   for(const d of w.documents.filter(d=>d.family_id===f.id&&['pending','missing','rejected'].includes(d.status))){
    const review=d.status==='pending';add({id:'document:'+d.id,title:`${review?'בדיקת מסמך':d.optional?'בירור מסמך רשות':'השלמת מסמך'} — ${d.name}`,owner:review||d.optional?rep?.name||'הנציג המטפל':'המשפחה',mine:review&&mine&&can('documents.manage'),waiting:!review||!can('documents.manage'),approval:review,target:familyTarget('documents'),label:review?'בדיקת המסמכים':'למסמכים המבוקשים'});
   }
   for(const s of w.familyServices.filter(s=>s.family_id===f.id&&['waiting_analysis','client_approved_execution'].includes(s.status))){
    const execution=s.status==='client_approved_execution';add({id:'assign:'+s.id,title:`${execution?'שיוך לביצוע':'שיוך לניתוח'} — ${w.services.find(x=>x.id===s.service_id)?.name||'תחום'}`,owner:rep?.name||'הנציג המטפל',mine:mine&&can(execution?'execution.send':'analysis.send'),waiting:!can(execution?'execution.send':'analysis.send'),approval:false,target:familyTarget('services'),label:execution?'שיוך לביצוע':'שיוך לבדיקה'});
   }
  }
  for(const [kind,tasks] of [['analysis',w.analysisTasks],['execution',w.executionTasks]] as const){
   for(const t of tasks.filter(t=>t.family_id===f.id&&!['approved','reassigned','completed','cancelled','not_completed'].includes(t.status))){
    const approval=kind==='analysis'?['submitted','analysis_received'].includes(t.status):t.status==='execution_reported_complete';
    const pro=w.professionals.find(p=>p.id===t.professional_id);const ownPro=w.profile.role==='professional';
    const actionable=approval?staff&&can(kind==='analysis'?'analysis.approve':'execution.approve'):ownPro;
    add({id:kind+':'+t.id,title:`${approval?'אישור':kind==='analysis'?'ניתוח':'ביצוע'} — ${w.services.find(s=>s.id===t.service_id)?.name||t.task_number}`,owner:approval?rep?.name||'הנציג המטפל':pro?.name||(ownPro?w.profile.name:'בעל המקצוע'),mine:approval?mine&&actionable:ownPro,waiting:!actionable,approval,due:t.due_at||undefined,target:approval&&kind==='analysis'?familyTarget('services'):{page:'tasks',kind,id:t.id},label:approval?'בדיקת הממצאים':'פתיחת המשימה'});
   }
  }
  if(staff){
   if(w.familyServices.some(s=>s.family_id===f.id&&s.status==='approved_analysis')&&!w.meetings.some(m=>m.family_id===f.id&&['scheduled','in_progress'].includes(m.status)))add({id:'schedule:'+f.id,title:'תיאום שיחה על הממצאים שאושרו',owner:rep?.name||'הנציג המטפל',mine:mine&&can('families.edit'),waiting:!can('families.edit'),approval:false,target:{page:'meetings',family:f.id},label:'לתכנון השיחה'});
   for(const m of w.meetings.filter(m=>m.family_id===f.id&&['scheduled','in_progress'].includes(m.status)))add({id:'meeting:'+m.id,title:m.status==='scheduled'?'שיחה מתוכננת':'שיחה בתהליך',owner:rep?.name||'הנציג המטפל',mine:mine&&can('families.edit'),waiting:!can('families.edit'),approval:false,due:m.scheduled_at||undefined,target:{page:'meetings',id:m.id},label:'לפרטי השיחה'});
   for(const t of w.followUps.filter(t=>t.family_id===f.id&&['open','in_progress'].includes(t.status)))add({id:'followup:'+t.id,title:t.title,owner:t.owner_name,mine:t.owner_role==='representative'&&mine&&can('families.edit'),waiting:t.owner_role==='client'||!can('families.edit'),approval:false,due:t.due_on,target:{page:'families',id:f.id,tab:'followups'},label:'למשימות ההמשך'});
   const finalMeeting=w.meetings.filter(m=>m.family_id===f.id&&m.status==='completed').sort((a,b)=>(b.scheduled_at||'').localeCompare(a.scheduled_at||''))[0];
   if(finalMeeting&&reportReadiness(w,finalMeeting.id).length===0&&!w.finalReports.some(r=>r.meeting_id===finalMeeting.id&&r.status==='approved')){const draft=w.finalReports.some(r=>r.meeting_id===finalMeeting.id);add({id:'final-report:'+finalMeeting.id,title:draft?'בדיקת הדוח הסופי ואישורו':'הכנת הדוח הסופי למשפחה',owner:rep?.name||'הנציג המטפל',mine:mine&&can('families.edit'),waiting:!can('families.edit'),approval:draft,target:{page:'meetings',id:finalMeeting.id,stage:'summary'},label:draft?'לבדיקת הדוח':'להכנת הדוח'});}

  }
 }
 return rows.sort((a,b)=>Number(isLate(b,now))-Number(isLate(a,now))||Number(b.mine)-Number(a.mine)||(a.due||'9999').localeCompare(b.due||'9999')||a.id.localeCompare(b.id));
}
export function filterWork(items:WorkItem[],filter:string,now=new Date()){
 return items.filter(i=>filter==='mine'?i.mine:filter==='today'?!!i.due&&(i.due.length===10?i.due:israelDay(new Date(i.due)))===israelDay(now):filter==='late'?isLate(i,now):filter==='approval'?i.approval:filter==='waiting'?i.waiting:true);
}
