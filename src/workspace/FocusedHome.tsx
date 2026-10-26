import {useState,type ReactNode} from 'react';
import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {nextActions} from './next-actions';
import {dueLabel} from '../followups/followup-utils';
import {CompanionPortrait} from '../companion/Companion';
import {ClientHelp} from '../ClientRequests';
import {useWorkingDrafts} from '../lib/draft-guard';
import {hasQuestionnaireAnswers} from '../families/chapter-progress';
import {Icon} from '../icons';
import './focused-home.css';

export function FocusedHome({w,open,refresh,children}:{w:Workspace;open:(r:RouteState)=>void;refresh:()=>Promise<void>;children:ReactNode}){
 const [expanded,setExpanded]=useState(false);
 const actions=nextActions(w),action=actions[0],role=w.profile.role;
 const drafts=useWorkingDrafts();
 const draft=action?.familyId?drafts.get('questionnaire:'+action.familyId)?.value as {answers?:unknown}|undefined:undefined;
 const continueLabel=action?.id.startsWith('intake:')&&hasQuestionnaireAnswers(draft?.answers)?'המשך מילוי השאלון':action?.label;
 const client=role==='client';
 const report=client&&!action?w.finalReports.filter(r=>r.status==='approved'&&r.snapshot&&w.families.some(f=>f.id===r.family_id)).sort((a,b)=>(b.snapshot?.approved_at||'').localeCompare(a.snapshot?.approved_at||''))[0]:undefined;
 const family=w.families.find(f=>f.id===(action?.familyId||report?.family_id))||w.families[0];
 const owner=w.representatives.find(r=>r.id===family?.representative_id)?.name;
 const partial=w.familiesTruncated||w.familyWorkTruncated||w.followUpsTruncated;
 const headings={client:family?.name||'הבית שלי',representative:'יום העבודה שלי',professional:'העבודה המקצועית שלי',admin:'מה מצריך החלטה',marketer:'ההפניות שלי'};
 const emptyTitle=partial?'אין בקשה פתוחה במידע שנטען':client?'כרגע אין פעולה שנדרשת מכם':role==='admin'?'אין כרגע אישור או שיוך שממתינים לכם':'אין כרגע משימה פתוחה באחריותך';
 const emptyDetail=client?owner?`${owner} מרכז את המשך הטיפול. בקשה חדשה תופיע כאן כשיהיה צורך בכם.`:'כשישויך נציג ותהיה בקשה להמשך, היא תופיע כאן.':role==='professional'?'משימות חדשות או בקשות לתיקון יופיעו כאן. עבודה שנשלחה לאישור נשארת במעקב.':'אפשר לעיין במצב העבודה לפי הצורך. פעולות של אנשים אחרים נשארות באחריותם.';
 return <section className="focused-home" data-focus-role={role}>
  <header className="focus-heading"><p className="eyebrow">{client?'טוב שחזרתם. ממשיכים מאיפה שעצרתם.':role==='admin'?'חריגים ואישורים באחריותך':'באחריותך להמשך הטיפול'}</p><h1>{headings[role]}</h1></header>
  <section className={`focus-task${!action?' focus-rest':''}`} aria-label="הפעולה הבאה שלי" data-action-id={action?.id||''}>
   <div className="focus-task-copy"><span className="focus-caption">{action?action.reason:report?'סיכום הטיפול':'מצב הטיפול'}</span>
    <h2>{action?.title||(report?'הדוח הסופי שלכם מוכן':emptyTitle)}</h2>
    {action?.familyName&&!client&&<p className="focus-family">{action.familyName}</p>}
    <p>{action?.detail||(report?'התוצאות וההמלצות רוכזו בדוח שאושר על ידי הנציג.':emptyDetail)}</p>
    {action?.due&&<p className="focus-due">מועד לטיפול: {dueLabel(action.due)}</p>}
    {action?<button className="primary" onClick={()=>open(action.target)}>{continueLabel}</button>:report?<button className="primary" onClick={()=>open({page:'meetings',id:report.meeting_id,stage:'summary'})}>לצפייה בדוח הסופי</button>:null}
   </div><div className="focus-companion" aria-hidden="true">{client?<CompanionPortrait pose={action?'explain':'welcome'}/>:<Icon name={role==='admin'?'check':role==='professional'?'work':'tasks'}/>}</div>
  </section>
  {actions.length>1&&<p className="focus-remaining">{actions.length===2?'בקשה נוספת מחכה בהמשך.':`עוד ${actions.length-1} ${client?'בקשות':'פריטים'} בהמשך.`}</p>}
  {partial&&<p className="focus-remaining">התצוגה מבוססת על המידע שנטען. יתר התיקים והפעולות זמינים ברשימות.</p>}
  <details className="focus-more" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}><summary>{client?'מצב התיק ומידע נוסף':role==='admin'?'תמונת המצב וכל העבודה':'תור העבודה והמעקב המלא'}</summary><div className="focus-secondary">{children}</div></details>
  {client&&family&&<ClientHelp familyId={family.id} w={w} refresh={refresh}/>}
 </section>;
}
