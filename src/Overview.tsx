import {WorkQueue} from './WorkQueue';
import type {RouteState} from './lib/navigation';
import type {Family,Workspace} from './lib/model';
import {nextStep,stages,type Destination} from './lib/workflow';
import {workQueue} from './lib/work-queue';
import {deadline,dueLabel,isOpen,orderedFollowUps} from './followups/followup-utils';
import {Icon} from './icons';
import {Empty,Panel,Badge} from './ui';

export function Journey({family,w,onNavigate,compact=false,activeTarget}:{family:Family;w:Workspace;onNavigate:(target:Destination)=>void;compact?:boolean;activeTarget?:Destination}){
 const next=nextStep(family,w);
 return <section className={`journey${compact?' compact':''}`} aria-label="השלב הבא בתהליך">
 {!compact&&<ol className="journey-stages">{stages.map((label,i)=><li key={label} aria-current={i===next.stage?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>}
 <div className="next-step"><div className="next-copy"><p className="eyebrow">{next.actionable?'הצעד הבא שלכם':'איפה עומד התהליך'}</p><h2>{next.title}</h2><p>{next.detail}</p><span className="owner"><Icon name="family"/> באחריות: {next.owner}</span></div>{next.target!==activeTarget&&<button className="primary" onClick={()=>onNavigate(next.target)}>{next.label}<Icon name="arrow"/></button>}</div>
 <p className="after-step"><strong>מה יקרה אחר כך?</strong> {next.after}</p>
 </section>;
}

export function Overview({w,openFamily,navigate,openRecord,filter,onFilter}:{w:Workspace;openFamily:(id:string,target?:Destination)=>void;navigate:(target:string)=>void;openRecord:(r:RouteState)=>void;filter:string;onFilter:(value:string)=>void}){
 const staff=['admin','representative'].includes(w.profile.role);
 const client=w.profile.role==='client';
 const followUps=w.followUps.filter(t=>!client||t.visible_to_client&&(!t.item_id||w.meetingItems.some(i=>i.id===t.item_id&&i.visible_to_client)));
 const work=workQueue(w);
 const today=new Date().toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long'});
 const updates=w.timeline.filter(t=>new Date(t.created_at).toDateString()===new Date().toDateString()).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const followUpPanel=w.followUpsEnabled&&followUps.some(isOpen)&&<Panel title="משימות המשך מהשיחות"><p className="muted">הפעולות הפתוחות הקרובות, לפי מועד. משימה באיחור נשארת פתוחה עד לעדכון.</p>{orderedFollowUps(followUps.filter(isOpen)).slice(0,4).map(t=><div className="followup-overview" key={t.id}><div><strong>{t.title}</strong><p><button className="text-button" onClick={()=>openFamily(t.family_id)}>{w.families.find(f=>f.id===t.family_id)?.name||'לתיק המשפחה'}</button> · {t.owner_name} · עד {dueLabel(t.due_on)} · {deadline(t)}</p></div><button onClick={()=>openFamily(t.family_id,'followups')}>למעקב</button></div>)}<button className="ghost" onClick={()=>navigate('followups')}>לכל משימות ההמשך</button></Panel>;
 return <><header className="page-title"><div><p className="eyebrow">{today} · {client?'האזור האישי':'סביבת העבודה'}</p><h1>שלום, {w.profile.name}</h1><p className="lead">{client?'כל השלבים, המסמכים וההחלטות — במקום אחד.':'מכאן ממשיכים לטפל, לבדוק ולהניע את התיקים קדימה.'}</p></div><span className="brand-seal">FAMILY<span>360</span></span></header>
 {client&&work.length>0&&<Panel title="פעולות שממתינות בתיקים שלכם">{work.map(t=><article className="case-action" key={t.id}><div><strong>{t.title}</strong><p>{t.familyName} · {t.owner} · עד {t.due}</p></div><button onClick={()=>openRecord(t.target)}>פתיחת הפעולה בתיק</button></article>)}</Panel>}{client&&followUpPanel}{client?<>{w.families.map(f=><section className="client-case" key={f.id}><div className="section-heading"><h2>{f.name}</h2><button className="ghost" onClick={()=>openFamily(f.id)}>פתיחת תיק<Icon name="arrow"/></button></div><Journey family={f} w={w} onNavigate={target=>openFamily(f.id,target)}/><div className="quick-links"><button onClick={()=>openFamily(f.id,'questionnaire')}><Icon name="tasks"/><span>השאלון שלי<small>הפרטים שמסרתם לבדיקה</small></span><Icon name="arrow"/></button><button onClick={()=>openFamily(f.id,'documents')}><Icon name="documents"/><span>המסמכים שלי<small>בקשות, העלאות ומצב בדיקה</small></span><Icon name="arrow"/></button><button onClick={()=>openFamily(f.id,'meetings')}><Icon name="meetings"/><span>השיחות וההחלטות<small>מועדים וסיכומים ששותפו איתכם</small></span><Icon name="arrow"/></button></div></section>)}{!w.families.length&&<Empty>עדיין לא שויך לחשבון תיק משפחה. יש לפנות לנציג המטפל כדי להתחיל.</Empty>}<Panel title="איך מתקדם התהליך?"><p className="muted">ממלאים שאלון ומצרפים מסמכים לפי הבקשה. הנציג מרכז את הבדיקה המקצועית, מסביר את הממצאים בשיחה ומתאם את הפעולות שאישרתם להמשך.</p></Panel></>:<>
 <div className="kpis"><article><span><Icon name="family"/> תיקים בגישה שלך</span><b>{w.families.length}</b><small>לפי הרשאות החשבון</small></article><article><span><Icon name="tasks"/> {staff?'פעולות צוות לטיפול':'פעולות שלי'}</span><b>{work.filter(r=>!r.waiting).length}</b><small>{'פעולות נפרדות בתיקים שבגישה שלך'}</small></article><article><span><Icon name="meetings"/> פגישות פתוחות</span><b>{w.meetings.filter(m=>['scheduled','in_progress'].includes(m.status)).length}</b><small>מתוכננות או בתהליך</small></article></div>
 {staff?<div className="dashboard-grid"><WorkQueue w={w} open={openRecord} filter={filter} onFilter={onFilter}/><Panel title="מה התחדש היום">{updates.length?updates.slice(0,8).map(t=><article className="timeline-entry" key={t.id}><time>{new Date(t.created_at).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</time><div><p>{t.title}</p><button className="text-button" onClick={()=>openFamily(t.family_id)}>{w.families.find(f=>f.id===t.family_id)?.name||'פתיחת תיק'}</button></div></article>):<Empty>אין פעילות חדשה היום בתיקים שבגישה שלך.</Empty>}<button className="ghost" onClick={()=>navigate('notifications')}>לכל ההתראות<Icon name="arrow"/></button></Panel></div>:<WorkQueue w={w} open={openRecord} filter={filter} onFilter={onFilter}/>}
 {followUpPanel}</>}</>;
}
