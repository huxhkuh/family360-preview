import {useState} from 'react';
import type {Family,Workspace} from '../lib/model';
import {questionnaireReview} from './questionnaire-review';

export function IntakeReview({family,w,onContinue}:{family:Family;w:Workspace;onContinue:()=>void}){
 const chapters=questionnaireReview(family.answers||{},w.services),[index,setIndex]=useState(0);
 const chapter=chapters[index];
 return <section className="card" aria-label="סקירת השאלון שנשלח"><p>סקירת התשובות שנשלחו · פרק {index+1} מתוך {chapters.length}</p><h2 tabIndex={-1} id="intake-review-title">{chapter?.title}</h2>{chapter?.items.length?<dl>{chapter.items.map((item,i)=><div key={i}><dt>{item.label}</dt><dd className="preserve-lines">{item.value}</dd></div>)}</dl>:<p>לא נמסרו פרטים בפרק הזה.</p>}<div className="actions">{index>0&&<button onClick={()=>setIndex(index-1)}>לפרק הקודם</button>}{index<chapters.length-1?<button className="primary" onClick={()=>{setIndex(index+1);document.getElementById('intake-review-title')?.focus();}}>לפרק הבא בסקירה</button>:<button className="primary" onClick={onContinue}>לבחירת תחומי הטיפול</button>}</div><details className="task-support"><summary>מעבר לפרק אחר בסקירה</summary>{chapters.map((c,i)=><button key={i} aria-current={i===index?'step':undefined} onClick={()=>setIndex(i)}>{c.title}</button>)}</details></section>;
}
