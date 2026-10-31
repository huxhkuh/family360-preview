import {useState} from 'react';
import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {clientActions} from '../workspace/next-actions';

/** Suggestions are local UI state; nothing here updates the family record. */
export function MeetingPreparation({w,familyId,open}:{w:Workspace;familyId:string;open:(route:RouteState)=>void}){
 const [question,setQuestion]=useState('');
 const [questions,setQuestions]=useState<string[]>([]);
 if(w.profile.role!=='client'||!w.families.some(f=>f.id===familyId))return null;
 const action=clientActions(w).find(item=>item.familyId===familyId);
 const add=()=>{const value=question.trim();if(!value)return;setQuestions(list=>[...list,value]);setQuestion('');};
 return <details className="client-meeting meeting-preparation"><summary>מתכוננים לשיחה עם הנציג</summary>
  <h2>אפשר להתחיל מצעד קטן</h2>
  {action?<><p><strong>{action.title}</strong></p><p>{action.detail}</p><button type="button" onClick={()=>open(action.target)}>{action.label}</button></>:<p>כרגע לא מופיעה פעולה פתוחה באחריותכם בתיק.</p>}
  <h3>מה תרצו לברר בשיחה?</h3>
  <ul><li>מה חשוב לנו לבדוק או לשפר?</li><li>אילו פרטים או מסמכים כדאי להכין?</li><li>מה השלב הבא אחרי השיחה?</li>{questions.map((item,index)=><li key={index}>{item}</li>)}</ul>
  <label htmlFor={`meeting-question-${familyId}`}>הוספת נושא אישי לרשימה</label>
  <div><input id={`meeting-question-${familyId}`} value={question} maxLength={300} onChange={e=>setQuestion(e.target.value)} placeholder="נושא שתרצו לזכור"/> <button type="button" onClick={add}>הוספה לרשימה</button></div>
  <p className="muted">הרשימה זמנית בדף הזה בלבד ואינה נשלחת לנציג או נשמרת לאחר רענון. אפשר לרשום אותה לעצמכם לפני השיחה.</p>
 </details>;
}
