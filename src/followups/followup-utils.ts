import type {FollowUp} from '../lib/model';
export function israelDay(date=new Date()){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');
}
export const isOpen=(task:FollowUp)=>['open','in_progress'].includes(task.status);
export function deadline(task:FollowUp,today=israelDay()){
 if(!isOpen(task)||!task.due_on)return '';
 return task.due_on<today?'באיחור':task.due_on===today?'להיום':'בהמשך';
}
export function dueLabel(day:string){if(!day)return 'טרם נקבע מועד';return new Date(day+'T12:00:00Z').toLocaleDateString('he-IL',{timeZone:'Asia/Jerusalem',day:'numeric',month:'long',year:'numeric'});}
export const followUpStatuses={open:'לביצוע',in_progress:'בטיפול',completed:'הושלמה',cancelled:'בוטלה'};
export function orderedFollowUps(tasks:FollowUp[]){return [...tasks].sort((a,b)=>Number(isOpen(b))-Number(isOpen(a))||a.due_on.localeCompare(b.due_on)||a.id.localeCompare(b.id));}
