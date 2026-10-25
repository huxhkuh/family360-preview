import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {workQueue,isLate} from '../lib/work-queue';
import {MeetingLaunch} from '../meetings/MeetingLaunch';
import {WorkQueue} from '../WorkQueue';
export function RepresentativeHome({w,open,filter,onFilter}:{w:Workspace;open:(route:RouteState)=>void;filter:string;onFilter:(filter:string)=>void}){
 const work=workQueue(w),mine=work.filter(i=>i.mine),late=work.filter(i=>isLate(i)),approvals=work.filter(i=>i.approval),waiting=work.filter(i=>i.waiting);
 return <div className="rep-workspace"><header className="rep-page-heading"><div><p className="eyebrow">{new Date().toLocaleDateString('he-IL',{weekday:'long',day:'numeric',month:'long'})} · {w.profile.name}</p><h1>יום העבודה שלי</h1><p>מכינים את המשפחות לשיחה, מתעדים החלטות ומלווים את הביצוע עד הסיום.</p></div><button className="ghost" onClick={()=>open({page:'families'})}>לכל תיקי המשפחות</button></header>
 <MeetingLaunch w={w} open={open}/>
 <nav className="rep-priorities" aria-label="סדר העדיפויות שלי">{[['mine','פעולות באחריותי',mine.length],['late','פעולות באיחור',late.length],['approval','ממצאים לאישור',approvals.length],['waiting','במעקב — ממתינים לאחרים',waiting.length]].map(([key,label,count])=><button key={key} className={filter===key?'active':''} aria-pressed={filter===key} onClick={()=>onFilter(String(key))}><strong>{count}</strong><span>{label}</span></button>)}</nav>
 <WorkQueue w={w} open={open} filter={filter} onFilter={onFilter}/>
 <details className="rep-secondary"><summary>עדכונים אחרונים בתיקים</summary>{w.timeline.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,6).map(item=><article key={item.id}><div><strong>{item.title}</strong><p>{w.families.find(f=>f.id===item.family_id)?.name||'תיק משפחה'} · {new Date(item.created_at).toLocaleDateString('he-IL')}</p></div><button className="ghost" onClick={()=>open({page:'families',id:item.family_id})}>לתיק המשפחה</button></article>)}{!w.timeline.length&&<p>אין כרגע עדכונים בתיקים שבגישה שלך.</p>}</details>
 </div>;
}
