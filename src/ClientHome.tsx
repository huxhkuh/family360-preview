import {ClientCompletion} from './ClientCompletion';
import type {Workspace,Family} from './lib/model';
import type {RouteState} from './lib/navigation';
import {ClientJourney} from './ClientJourney';
import {ClientHelp} from './ClientRequests';
import {Badge,Empty} from './ui';
import {dueLabel} from './followups/followup-utils';

export function ClientHome({family:f,w,open,refresh}:{family:Family;w:Workspace;open:(r:RouteState)=>void;refresh:()=>Promise<void>}){
 const go=(tab:string,focus?:string)=>open({page:'families',id:f.id,tab,focus});
 const submitted=f.onboarding_pct===100;
 const tasks=[...w.familyTasks,...w.followUps.filter(t=>!t.item_id||w.meetingItems.some(i=>i.id===t.item_id&&i.visible_to_client))].filter(t=>t.family_id===f.id&&t.visible_to_client&&['open','in_progress'].includes(t.status)).sort((a,b)=>(a.due_on||'9999').localeCompare(b.due_on||'9999')||a.id.localeCompare(b.id));
 const mine=tasks.filter(t=>t.owner_role==='client'),care=tasks.filter(t=>t.owner_role==='representative');
 const docs=w.documents.filter(d=>d.family_id===f.id),missing=docs.filter(d=>['missing','rejected'].includes(d.status)&&!mine.some(t=>t.document_id===d.id));
 const pending=docs.filter(d=>d.status==='pending');
 const meetings=w.meetings.filter(m=>m.family_id===f.id&&m.status!=='cancelled').sort((a,b)=>(b.scheduled_at||'').localeCompare(a.scheduled_at||''));
 const upcoming=meetings.filter(m=>['scheduled','in_progress'].includes(m.status)).sort((a,b)=>(a.scheduled_at||'9999').localeCompare(b.scheduled_at||'9999'));
 const last=meetings.find(m=>m.status==='completed');
 const owner=w.representatives.find(r=>r.id===f.representative_id)?.name||'טרם שויך נציג';
 const count=mine.length+missing.length;
 return <section className="client-home" aria-label={`האזור האישי של ${f.name}`}><div className="section-heading"><div><h1>{f.name}<span className="family-period" aria-hidden="true">.</span></h1><p className="muted">הנציג המטפל: {owner}</p></div><button className="ghost" onClick={()=>go('overview')}>פרטי התיק</button></div>
 {submitted&&<ClientCompletion family={f} w={w}/>}
 {!submitted&&<ClientJourney family={f} w={w} onNavigate={go}/>}
 {submitted&&<section className="client-priorities" aria-labelledby={`client-actions-${f.id}`}><header><p className="eyebrow">הצעד הבא שלכם</p><h2 id={`client-actions-${f.id}`}>מה נדרש ממני{count?` · ${count}`:''}</h2><p>{count?'אפשר להשלים כל פעולה מהמקום שבו היא מופיעה.':'כרגע אין פעולה פתוחה באחריותכם. עדכונים ובקשות נוספות יופיעו כאן.'}</p></header>
 {mine.map((t,i)=>{const doc=docs.find(d=>d.id===t.document_id);const attach=doc&&['missing','rejected'].includes(doc.status);return <article className="client-action-row" key={t.id}><div><h3>{t.title}</h3><p>{t.details}</p><small>{t.due_on?`עד ${dueLabel(t.due_on)}`:'טרם נקבע מועד'} · {t.status==='in_progress'?'התחלתם לטפל':'ממתינה לכם'}</small></div><button className={i===0?'primary':''} onClick={()=>go(attach?'documents':'followups',attach?doc.id:t.id)}>{attach?'לצירוף המסמך':'לפרטי הפעולה ולעדכון'}</button></article>;})}
 {missing.map(d=><article className="client-action-row" key={d.id}><div><h3>{d.name}</h3><p>{d.reject_reason||d.purpose||'נדרש צירוף מסמך או תיעוד הסכמה.'}</p></div><button className={!mine.length?'primary':''} onClick={()=>go('documents',d.id)}>להשלמת הבקשה</button></article>)}
 </section>}
 {submitted&&<section className="client-care" aria-labelledby={`client-care-${f.id}`}><h2 id={`client-care-${f.id}`}>בטיפול עבורי</h2><p className="muted">הפעולות כאן באחריות הנציג. אין צורך לבצע אותן בעצמכם.</p>{care.map(t=><article className="client-action-row" key={t.id}><div><h3>{t.title}</h3><p>{t.details}</p><small>{t.owner_name} · {t.due_on?`מועד במעקב: ${dueLabel(t.due_on)}`:'טרם נקבע מועד לחזרה'}</small></div><Badge status={t.status}/></article>)}{pending.map(d=><article className="client-action-row" key={d.id}><div><h3>{d.name}</h3><p>המסמך ממתין לבדיקה. אין צורך לצרף אותו שוב.</p></div><button className="ghost" onClick={()=>go('documents',d.id)}>למצב המסמך</button></article>)}{!care.length&&!pending.length&&<Empty>אין כרגע משימות מעקב או מסמכים שממתינים לבדיקה. אפשר לעיין במצב תחומי הטיפול.</Empty>}<button className="text-button" onClick={()=>go('services')}>מצב תחומי הטיפול</button></section>}
 {(upcoming.length>0||last)&&<section className="client-meeting"><h2>{upcoming.length?'השיחה הקרובה':'השיחה האחרונה ששמרנו'}</h2>{[upcoming[0]||last!].map(m=><div key={m.id}><p>{m.scheduled_at?new Date(m.scheduled_at).toLocaleString('he-IL'):'טרם נקבע מועד'}</p><button onClick={()=>open({page:'meetings',id:m.id,stage:'summary'})}>{m.status==='completed'?'לסיכום השיחה ולהחלטות':'לפרטי השיחה'}</button></div>)}</section>}
 <nav className="client-reference" aria-label="המידע שלי"><button onClick={()=>go('questionnaire')}>השאלון שלי</button><button onClick={()=>go('documents')}>כל המסמכים</button><button onClick={()=>go('followups')}>כל הפעולות והמעקב</button><button onClick={()=>go('meetings')}>כל השיחות</button></nav>
 <ClientHelp familyId={f.id} w={w} refresh={refresh}/>
 {submitted&&<details className="client-process-reference"><summary>המסלול המלא · תשלום, שאלון, מסמכים והנציג</summary><ClientJourney family={f} w={w} onNavigate={go}/></details>}
 </section>;
}
