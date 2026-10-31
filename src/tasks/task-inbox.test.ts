import {test,expect} from 'vitest';
import {actionableTask,orderInbox} from './task-inbox';
import type {Task} from '../lib/model';
const row=(id:string,status:string,due_at?:string)=>({id,task_number:id,status,due_at}) as Task;
test('submitted and finished work leave the actionable inbox',()=>{
 for(const status of ['submitted','approved','completed','cancelled','reassigned','execution_reported_complete'])expect(actionableTask(row('a',status))).toBe(false);
 for(const status of ['assigned','returned','waiting_client','execution_in_progress'])expect(actionableTask(row('a',status))).toBe(true);
});
test('returned work precedes deadlines, unknown dates sort last without mutating input',()=>{
 const tasks=[row('z','assigned','bad'),row('c','assigned','2030-01-02'),row('b','assigned','2030-01-01'),row('a','returned')];
 expect(orderInbox(tasks).map(t=>t.id)).toEqual(['a','b','c','z']);expect(tasks[0].id).toBe('z');
});
