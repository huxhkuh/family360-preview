import type {ReactNode} from 'react';
import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import type {NextAction} from '../workspace/next-actions';
import {BrandLogo} from '../branding/Brand';
import {Icon} from '../icons';
import {dueLabel} from '../followups/followup-utils';
import {ClientHelp} from '../ClientRequests';

export function ClientLanding({w,actions,label,open,refresh,children}:{w:Workspace;actions:NextAction[];label?:string;refresh:()=>Promise<void>;open:(r:RouteState)=>void;children:ReactNode}){
 const action=actions[0];
 const report=!action?w.finalReports.filter(r=>r.status==='approved'&&r.snapshot&&w.families.some(f=>f.id===r.family_id)).sort((a,b)=>(b.snapshot?.approved_at||'').localeCompare(a.snapshot?.approved_at||''))[0]:undefined;
 const family=w.families.find(f=>f.id===(action?.familyId||report?.family_id))||w.families[0];
 const owner=w.representatives.find(r=>r.id===family?.representative_id)?.name;
 const firstName=owner?.split(' ')[0];
 const partial=w.familiesTruncated||w.familyWorkTruncated||w.followUpsTruncated;
 const casePage=(tab:string)=>open(family?{page:'families',id:family.id,tab}:{page:'families'});
 const contact=()=>open({page:'help',family:family?.id});
 const shortcuts=[['followups','tasks','הפעולות שלנו','המשימות והצעדים להמשך'],['documents','documents','המסמכים שלי','המסמכים והטפסים שבתיק'],['services','services',firstName?`בטיפול של ${firstName}`:'בטיפול עבורנו','הבדיקות וההמלצות'],['meetings','meetings','שיחות וסיכומים','העדכונים וההחלטות']];
 return <section className="client-atelier-home focused-home" data-focus-role="client">
  <div className="home-composition">
   <section className="next-action focus-task" aria-label="הפעולה הבאה שלי" data-action-id={action?.id||''}>
    <p className="eyebrow">האזור האישי</p>
    <header className="focus-heading"><h1>{family?.name||'טוב שחזרתם'}<span>,</span></h1></header>
    <div className="focus-task-copy"><h2>{action?.title||(report?'הדוח הסופי שלכם מוכן':!family?'התיק שלכם בדרך':partial?'אין בקשה פתוחה במידע שנטען':'כרגע אין פעולה שנדרשת מכם')}</h2>
    <p>{action?.detail||(report?'התוצאות וההמלצות רוכזו בדוח שאושר על ידי הנציג.':!family?'לאחר שיוך התיק לחשבון, הוא יופיע כאן.':owner?`${owner} מרכז את המשך הטיפול. בקשה חדשה תופיע כאן כשיהיה צורך בכם.`:'כשישויך נציג ותהיה בקשה להמשך, היא תופיע כאן.')}</p>
    {action?.due&&<p className="focus-due">מועד לטיפול: {dueLabel(action.due)}</p>}
    <div className="hero-actions">{action?<button className="primary" onClick={()=>open(action.target)}><Icon name={action.target.tab==='documents'?'upload':'arrow'}/>{label||action.label}</button>:report?<button className="primary" onClick={()=>open({page:'meetings',id:report.meeting_id,stage:'summary'})}>לצפייה בדוח הסופי<Icon name="report"/></button>:family?<button className="primary" onClick={()=>casePage('documents')}>לפתיחת התיק<Icon name="account"/></button>:null}{family&&<button className="text" onClick={contact}>{firstName?`שאלה ל${firstName}`:'פנייה לנציג'}<span aria-hidden="true">←</span></button>}</div></div>
    {owner&&<p className="hero-service"><Icon name="help"/>{owner} · הנציג שמלווה אתכם</p>}
    {actions.length>1&&<p className="client-next-count">{actions.length===2?'בקשה נוספת מחכה בהמשך.':`עוד ${actions.length-1} בקשות בהמשך.`}</p>}
   </section>
   {family&&<div className="dossier-scene" aria-label="התיק המשפחתי"><div className="dossier-back" aria-hidden="true"/><div className="dossier-shell">
    <div className="dossier-front"><div className="dossier-meta"><span>תיק <bdi>{family.case_number}</bdi></span><span>תיק משפחתי</span></div><BrandLogo mode="dark" mark className="dossier-logo"/><h3>{family.name}</h3><p>המסמכים. הפרטים. ההחלטות.</p>
     <div className="dossier-counts">{[
      {tab:'followups',icon:'tasks',count:actions.filter(a=>a.familyId===family.id).length,text:'פעולות פתוחות'},
      {tab:'services',icon:'services',count:w.familyServices.filter(s=>s.family_id===family.id).length,text:'תחומי טיפול'},
      {tab:'documents',icon:'documents',count:w.documents.filter(d=>d.family_id===family.id&&['pending','approved','signed'].includes(d.status)).length,text:'מסמכים שצורפו'}
     ].map(item=><button key={item.tab} onClick={()=>casePage(item.tab)}><Icon name={item.icon}/><strong>{item.count}</strong><span>{item.text}</span></button>)}</div>
     <button className="dossier-open" onClick={()=>casePage('documents')}>לפתיחת התיק ולכל המסמכים<span aria-hidden="true">←</span></button>
    </div>
    <nav className="dossier-sidebar" aria-label="קיצורי דרך לתיק"><button className="dossier-current" onClick={()=>open({page:'overview'})}><Icon name="home"/>דף הבית</button><button onClick={()=>casePage('documents')}><Icon name="documents"/>המסמכים שלי</button><button onClick={()=>casePage('questionnaire')}><Icon name="questionnaire"/>פרטים אישיים</button><button onClick={()=>casePage('overview')}><Icon name="account"/>פרטי התיק</button><div className="dossier-advisor"><strong>ליווי אישי</strong><span>{owner||'נציג ישויך לתיק בהמשך'}</span><button className="dossier-contact" onClick={contact}><Icon name="help"/>יצירת קשר</button></div></nav>
   </div></div>}
  </div>
  {family&&<nav className="home-links" aria-label="בתיק שלנו">{shortcuts.map(([tab,icon,title,detail])=><button key={tab} onClick={()=>casePage(tab)}><Icon name={icon}/><strong>{title}</strong><small>{detail}</small></button>)}</nav>}
  {partial&&<p className="client-next-count">התצוגה מבוססת על המידע שנטען. יתר התיקים והפעולות זמינים ברשימות.</p>}
  <details className="focus-more client-atelier-home-details"><summary>מצב התיק ומידע נוסף</summary><div className="focus-secondary">{children}{family&&<ClientHelp familyId={family.id} w={w} refresh={refresh}/>}</div></details>
 </section>;
}

export function ClientContact({w,familyId,refresh,open}:{w:Workspace;familyId?:string;refresh:()=>Promise<void>;open:(r:RouteState)=>void}){
 const family=w.families.find(f=>f.id===familyId)||(!familyId?w.families[0]:undefined);
 const owner=w.representatives.find(r=>r.id===family?.representative_id)?.name;
 return <section className="client-contact-page"><header><p className="eyebrow">הליווי האישי שלכם</p><h1>{owner?`הקשר עם ${owner.split(' ')[0]}`:'הקשר עם הנציג'}<span>.</span></h1>{owner&&<p>{owner} · הנציג שלכם</p>}</header><div className="client-contact-sheet">{w.families.length>1&&<label>בחירת תיק<select value={family?.id||''} onChange={e=>open({page:'help',family:e.target.value})}>{w.families.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}{family?<><h2>{family.name}</h2><ClientHelp familyId={family.id} w={w} refresh={refresh} expanded/><button className="text-button" onClick={()=>open({page:'families',id:family.id,tab:'followups'})}>לפניות ולפעולות שבתיק ←</button></>:<p>לאחר שיוך תיק לחשבון, יהיה אפשר לפנות לנציג מכאן.</p>}</div></section>;
}
