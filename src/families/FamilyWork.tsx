import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {Badge,Empty} from '../ui';
export function FamilyWork({w,familyId,tab,open}:{w:Workspace;familyId:string;tab:'tasks'|'meetings';open:(r:RouteState)=>void}){
 if(tab==='meetings'){
  const list=w.meetings.filter(m=>m.family_id===familyId).sort((a,b)=>(b.scheduled_at||'').localeCompare(a.scheduled_at||''));
  return <section aria-label="שיחות בתיק"><h2>שיחות והחלטות</h2>{list.map(m=><article className="card" key={m.id}><Badge status={m.status}/><p>{m.scheduled_at?new Date(m.scheduled_at).toLocaleString('he-IL'):'טרם נקבע מועד'}</p><button onClick={()=>open({page:'meetings',id:m.id})}>פתיחת השיחה</button></article>)}{!list.length&&<Empty>עדיין אין שיחות בתיק.</Empty>}{['admin','representative'].includes(w.profile.role)&&<button onClick={()=>open({page:'meetings',family:familyId})}>לתכנון פגישה בתיק</button>}</section>;
 }
 const list=[...w.analysisTasks.map(t=>({...t,kind:'analysis'})),...w.executionTasks.map(t=>({...t,kind:'execution'}))].filter(t=>t.family_id===familyId);
 return <section aria-label="משימות בתיק"><h2>משימות מקצועיות</h2><div className="cards">{list.map(t=><article className="task-card" key={t.kind+t.id}><strong>{t.task_number} · {w.services.find(s=>s.id===t.service_id)?.name}</strong><Badge status={t.status}/><span>באחריות: {w.professionals.find(p=>p.id===t.professional_id)?.name||'בעל המקצוע'}</span><button onClick={()=>open({page:'tasks',kind:t.kind,id:t.id})}>פתיחת המשימה</button></article>)}</div>{!list.length&&<Empty>אין משימות מקצועיות בתיק. שיוך לבעל מקצוע נעשה בלשונית תחומי טיפול.</Empty>}</section>;
}
