import type {Task} from '../lib/model';
export const actionableTask=(task:Task)=>['assigned','in_progress','returned','sent_execution','execution_in_progress','waiting_client','needs_info'].includes(task.status);
export function orderInbox(tasks:Task[]){
 const due=(task:Task)=>{const value=Date.parse(task.due_at||'');return Number.isFinite(value)?value:Infinity;};
 return [...tasks].sort((a,b)=>Number(b.status==='returned')-Number(a.status==='returned')||(due(a)<due(b)?-1:due(a)>due(b)?1:0)||a.task_number.localeCompare(b.task_number));
}
