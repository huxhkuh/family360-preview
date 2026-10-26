import {Children,isValidElement,type ReactNode} from 'react';
import './task-surface.css';
// Disclosure preserves mounted forms and drafts. Validation can open its ancestors.
export function TaskSupport({active=true,title,children}:{active?:boolean;title:string;children:ReactNode}){
 return active?<details className="task-support"><summary>{title}</summary><div className="task-support-content">{children}</div></details>:<>{children}</>;
}
export function RecordFocus({focus,title,children}:{focus?:string;title:string;children:ReactNode}){
 const records=Children.toArray(children);
 if(!focus)return <>{children}</>;
 const primary=records.find(c=>isValidElement(c)&&((c.props as {'data-record-id'?:string;recordId?:string})['data-record-id']||(c.props as {recordId?:string}).recordId)===focus);
 const rest=records.filter(c=>c!==primary);
 return <div className="record-focus" data-focused-record={focus}>{primary||<p role="status" className="hint">הפריט המבוקש אינו זמין ברשימה שנטענה. אפשר לבדוק את יתר הפריטים או לחזור לצעד הבא. <a href="#/overview">חזרה לצעד הבא שלי</a></p>}{rest.length>0&&<TaskSupport title={title}>{rest}</TaskSupport>}</div>;
}
