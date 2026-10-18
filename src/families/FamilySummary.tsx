import {useState} from 'react';
import type {Family,Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {workQueue,isLate,israelDay} from '../lib/work-queue';
import {Panel,Empty} from '../ui';
export function FamilySummary({family,w,open}:{family:Family;w:Workspace;open:(r:RouteState)=>void}){
 const [expanded,setExpanded]=useState(false);const all=workQueue(w).filter(t=>t.familyId===family.id);const now=new Date();const today=israelDay(now);const updates=w.timeline.filter(t=>t.family_id===family.id&&israelDay(new Date(t.created_at))===today);
 const percentage=Math.min(100,Math.max(0,family.onboarding_pct||0));
 return <Panel title="מה דורש טיפול בתיק"><div className="case-summary"><div><strong>{all.filter(t=>isLate(t,now)).length}</strong><span>פעולות באיחור</span></div><div><strong>{all.filter(t=>t.due&&(t.due.length===10?t.due:israelDay(new Date(t.due)))===today).length}</strong><span>פעולות להיום</span></div><div><strong>{w.documents.filter(d=>d.family_id===family.id&&['missing','rejected'].includes(d.status)).length}</strong><span>מסמכים להשלמה</span></div><div><strong>{percentage}%</strong><span>השלמת השאלון</span><progress max={100} value={percentage} aria-label="השלמת השאלון"/></div></div><p className="muted">אחוז השאלון אינו אחוז ההשלמה של כל הטיפול. כל תחום ממשיך לפי מצבו.</p>
 {(expanded?all:all.slice(0,5)).map(t=><article className="case-action" key={t.id}><div><strong>{t.title}</strong><p>{t.owner}{t.due?` · ${t.due.slice(0,10)}`:''}{isLate(t,now)?' · באיחור':''}</p></div><button onClick={()=>open(t.target)}>{t.label}</button></article>)}{!all.length&&<Empty>אין כרגע פעולות פתוחות בתור של המשפחה.</Empty>}{all.length>5&&<button className="ghost" onClick={()=>setExpanded(!expanded)}>{expanded?'הצגת חמש פעולות':'הצגת כל הפעולות בתיק'}</button>}
 {!!updates.length&&<details><summary>מה התחדש היום ({updates.length})</summary>{updates.map(t=><p key={t.id}>{t.title}</p>)}</details>}</Panel>;
}
