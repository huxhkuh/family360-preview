import {describe,expect,it} from 'vitest';
import type {Task,Workspace} from '../lib/model';
import {findingsDraft,professionalPreparation} from './professional-preparation';

const task={id:'t',family_id:'f1',professional_id:'p1',status:'returned',snapshot:[{label:'שכר',value:0},{label:'מספר מסמך',value:''}],return_history:[{reason:'לבדוק יתרה',at:'2026-01-01'}]} as unknown as Task;
const workspace={profile:{id:'u1',role:'professional'},professionals:[{id:'p1',profile_id:'u1',active:true,profile_active:true}],documents:[{id:'d1',family_id:'f1'},{id:'d2',family_id:'f2'}]} as unknown as Workspace;

describe('professional preparation',()=>{
 it('uses only the assigned task and accessible documents for its family',()=>{
  const p=professionalPreparation(workspace,task)!;
  expect(p.documents.map(d=>d.id)).toEqual(['d1']);
  expect(p.missing.map(f=>f.label)).toEqual(['מספר מסמך']);
  expect(p.returnReason).toBe('לבדוק יתרה');
 });
 it('does not expose preparation for a different professional or role',()=>{
  expect(professionalPreparation({...workspace,profile:{...workspace.profile,id:'another'}},task)).toBeNull();
  expect(professionalPreparation({...workspace,profile:{...workspace.profile,role:'client'}},task)).toBeNull();
 });
 it('uses only saved professional text and does not invent missing material',()=>{
  expect(findingsDraft(task)).toBe('');
  expect(findingsDraft({...task,current_situation:'יתרה 100',recommendation:'לברר מול הבנק'})).toBe('מצב קיים:\nיתרה 100\n\nחלופה או המלצה:\nלברר מול הבנק');
 });
});
