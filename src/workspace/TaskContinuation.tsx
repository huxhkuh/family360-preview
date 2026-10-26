import type {Workspace} from '../lib/model';
import {routeHash} from '../lib/navigation';
import {nextActions} from './next-actions';
import './task-surface.css';

export function TaskContinuation({w,message}:{w:Workspace;message:string}){
 const next=nextActions(w)[0];
 return <section className="task-continuation" aria-label="ממשיכים מכאן"><p role="status">{message}</p><p>{next?`הפעולה הבאה: ${next.title}`:'אין כרגע פעולה נוספת שנדרשת מכם. אפשר לחזור למצב הטיפול.'}</p><a className="button primary" href={routeHash(next?.target||{page:'overview'})}>{next?'המשך לצעד הבא':'חזרה למצב הטיפול'}</a></section>;
}
