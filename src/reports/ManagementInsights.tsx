import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {Panel} from '../ui';
import {workloadSummary} from './workload-summary';

export function ManagementInsights({w,open}:{w:Workspace;open:(r:RouteState)=>void}){
 const summary=workloadSummary(w);
 if(!summary)return null;
 return <Panel title="תמונת מצב לתיקים הטעונים">
  <p className="muted">הסיכום מבוסס על {summary.families} תיקים ונתוני המסמכים והפעולות שנטענו לחשבון. הרשימות עשויות להיות חלקיות; מספרי התיקים אינם מצטברים כי תיק יכול להופיע בכמה קבוצות.</p>
  {summary.limited&&<p role="status">חלק מהנתונים הוגבלו בטעינה, ולכן ייתכן שהתמונה אינה מלאה.</p>}
  <ul>
   <li><strong>{summary.waiting}</strong> תיקים עם פעולה שממתינה לאחרים לפי תור העבודה.</li>
   <li><strong>{summary.overdue}</strong> תיקים עם פעולה שמועד הטיפול שלה עבר.</li>
   <li><strong>{summary.missingDocuments}</strong> תיקים עם {summary.documentCount} מסמכים נדרשים שחסרים או נדחו.</li>
  </ul>
  {!!summary.representatives.length&&<><h3>פעולות לטיפול בתיקים לפי נציג מטפל</h3><p className="muted">מספר פעולות בתיקים ששויכו לנציג; הפעולות אינן בהכרח כולן באחריותו האישית.</p><ul>{summary.representatives.slice(0,5).map(rep=><li key={rep.id}>{rep.name}: {rep.items} פעולות</li>)}</ul></>}
  <button className="ghost" onClick={()=>open({page:'families'})}>לתיקי המשפחות</button>
 </Panel>;
}
