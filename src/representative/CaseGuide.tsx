import type {Family,Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {nextStep,stages,type Destination} from '../lib/workflow';
import {reportReadiness} from '../reports/report-data';
export function CaseGuide({family,w,tab,navigate,open}:{family:Family;w:Workspace;tab:Destination;navigate:(tab:Destination)=>void;open:(route:RouteState)=>void}){
 const activeMeeting=w.meetings.find(m=>m.family_id===family.id&&m.status==='in_progress')||w.meetings.find(m=>m.family_id===family.id&&m.status==='scheduled');
 const next=nextStep(family,w),meeting=w.meetings.filter(m=>m.family_id===family.id&&m.status==='completed').sort((a,b)=>(b.scheduled_at||'').localeCompare(a.scheduled_at||''))[0];
 const ready=!!meeting&&reportReadiness(w,meeting.id).length===0;
 const report=ready?w.finalReports.find(r=>r.meeting_id===meeting!.id&&r.status==='approved'):undefined;
 const reportDue=ready&&!report;
 const phase=reportDue||report?5:next.stage;
 const action=()=>{if(report)open({page:'meetings',id:report.meeting_id,stage:'summary'});else if(reportDue)open({page:'meetings',id:meeting!.id,stage:'summary'});else if(next.target==='meetings'&&activeMeeting)open({page:'meetings',id:activeMeeting.id,family:family.id});else navigate(next.target);};
 return <section className="rep-case-guide" aria-label="השלב הבא בתהליך"><ol aria-label="שלבי הליווי">{[...stages,'דוח וסיום'].map((label,index)=><li key={label} aria-current={index===phase?'step':undefined} className={index===phase?'current':''}><span>{index+1}</span>{label}</li>)}</ol><div className="rep-next-action"><div><p className="eyebrow">{report?'הטיפול הסתיים':reportDue||next.actionable?'הפעולה הבאה בתיק':'מה מעכב את ההמשך'}</p><h2>{report?'הדוח הסופי אושר למשפחה':reportDue?'הכנת הדוח הסופי למשפחה':next.title}</h2><p>{report?'הדוח המאושר זמין למשפחה. תיקון שלו ידרוש אישור מחדש.':reportDue?'הפגישות והמשימות סגורות. מרכזים את הנתונים, בודקים את התוצאות ומאשרים את הדוח הסופי.':next.detail}</p><small>באחריות: {reportDue||report?'הנציג המטפל':next.owner}</small></div>{(reportDue||report||next.target!==tab)&&<button className={reportDue||next.actionable?'primary':'ghost'} onClick={action}>{report?'לדוח הסופי שאושר':reportDue?'לנתוני הדוח ולאישור':next.label}</button>}</div>{!report&&!reportDue&&<p className="rep-after-step"><strong>לאחר מכן: </strong>{next.after}</p>}</section>;
}
