import {expect,it} from 'vitest';
import {deadline,israelDay,orderedFollowUps} from './followup-utils';
import type {FollowUp} from '../lib/model';
const task={id:'a',status:'open',due_on:'2026-10-15'} as FollowUp;
it('uses the Israel calendar day even across midnight and winter time',()=>{
 expect(israelDay(new Date('2026-10-14T21:30:00Z'))).toBe('2026-10-15');
 expect(israelDay(new Date('2026-12-14T21:30:00Z'))).toBe('2026-12-14');
});
it('does not mark tasks late until the day after their deadline or after closing',()=>{
 expect(deadline(task,'2026-10-15')).toBe('להיום');expect(deadline(task,'2026-10-16')).toBe('באיחור');
 expect(deadline({...task,status:'completed'},'2026-10-16')).toBe('');
 expect(orderedFollowUps([{...task,id:'closed',status:'completed',due_on:'2020-01-01'},task,{...task,id:'early',due_on:'2026-10-01'}]).map(t=>t.id)).toEqual(['early','a','closed']);
});
