import type {Workspace} from './lib/model';
import type {RouteState} from './lib/navigation';
import {filterWork,isLate,workFilters,workQueue} from './lib/work-queue';
import {Empty,Panel} from './ui';
export function WorkQueue({w,filter,onFilter,open}:{w:Workspace;filter:string;onFilter:(value:string)=>void;open:(route:RouteState)=>void}){
 const all=workQueue(w);const rows=filterWork(all,filter);
 return <Panel title="מה דורש טיפול עכשיו"><p className="muted">פעולות באיחור מופיעות תחילה.</p><nav className="tabs" aria-label="סינון תור עבודה">{workFilters.map(([key,label])=><button key={key} aria-pressed={filter===key} className={filter===key?'selected':'ghost'} onClick={()=>onFilter(key)}>{label} ({filterWork(all,key).length})</button>)}</nav>
 {rows.map(i=><article key={i.id} className="work-row"><div className="work-row-title"><strong>{i.familyName}</strong><span className="badge">{i.mine?'פעולה שלי':i.waiting?'במעקב — ממתינים לאחר':'פעולת צוות'}</span></div><h3>{i.title}</h3><p>באחריות: {i.owner}</p><div className="work-row-footer"><span className={isLate(i)?'deadline':'muted'}>{i.due?`${isLate(i)?'באיחור · ':''}${new Date(i.due.length===10?i.due+'T12:00:00':i.due).toLocaleDateString('he-IL',{timeZone:'Asia/Jerusalem'})}`:'לא נקבע מועד יעד'}</span><button onClick={()=>open(i.target)}>{i.label}</button></div></article>)}
 {!rows.length&&<Empty>אין פעולות שמתאימות לתצוגה זו. אפשר לבחור ״הכול״ כדי לראות את יתר העבודה.</Empty>}</Panel>;
}
