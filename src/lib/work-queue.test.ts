import {describe,it,expect} from 'vitest';
import {filterWork,workQueue} from './work-queue';
import {workspaceSchema} from './model';
function workspace(){return workspaceSchema.parse({profile:{id:'p1',name:'Rep',active:true,role:'representative'},permissions:['families.edit','documents.manage','analysis.approve'],families:[{id:'f1',name:'Family',case_number:'1',status:'meeting_set',representative_id:'r1'}],representatives:[{id:'r1',profile_id:'p1',name:'Rep',active:true,permissions:[]}],services:[],familyServices:[],documents:[],analysisTasks:[],executionTasks:[],meetings:[],meetingItems:[],professionals:[],professionalServices:[],profiles:[],notifications:[],timeline:[],audit:[],settings:{},automations:[],templates:[],documentTypes:[],limit:500});}
const now=new Date('2026-10-18T10:00:00Z');
describe('action queue',()=>{
 it('routes independent family tasks by visibility, active status and current representative',()=>{
  const w=workspace();const task={id:'t1',family_id:'f1',title:'Call family',details:'',owner_role:'representative' as const,owner_name:'Rep',due_on:'2026-10-17',visible_to_client:false,status:'open' as const,revision:1,updated_at:now.toISOString()};
  w.familyTasks=[task,{...task,id:'t2',owner_role:'client',visible_to_client:true},{...task,id:'done',status:'completed'}];
  expect(filterWork(workQueue(w,now),'mine',now).map(i=>i.id)).toEqual(['family-task:t1']);
  expect(workQueue(w,now)[0].target).toEqual({page:'families',id:'f1',tab:'followups'});
  w.representatives[0].profile_id='another';expect(filterWork(workQueue(w,now),'mine',now)).toEqual([]);
  w.profile.role='client';expect(workQueue(w,now).map(i=>i.id)).toEqual(['family-task:t2']);expect(workQueue(w,now)[0].mine).toBe(true);
  w.profile.role='professional';expect(workQueue(w,now)).toEqual([]);
 });
 it('offers scheduling after analysis approval, and replaces it with the open meeting',()=>{
  const w=workspace();w.familyServices=[{id:'s',family_id:'f1',service_id:'s1',status:'approved_analysis',analysis_task_id:'a',execution_task_id:null}];
  expect(workQueue(w,now)).toEqual([expect.objectContaining({id:'schedule:f1',mine:true,target:{page:'meetings',family:'f1'}})]);
  w.meetings=[{id:'m',family_id:'f1',status:'scheduled',scheduled_at:null,type:'phone'}];expect(workQueue(w,now).map(i=>i.id)).toEqual(['meeting:m']);
 });
 it('shows concurrent work for one family and never hides an overdue task behind a future meeting',()=>{
  const w=workspace();w.meetings=[{id:'m1',family_id:'f1',status:'scheduled',scheduled_at:'2026-10-20T10:00:00Z',type:'phone'}];w.analysisTasks=[{id:'a1',family_id:'f1',family_service_id:'fs1',service_id:'s1',professional_id:'pro1',task_number:'A1',status:'assigned',due_at:'2026-10-17T10:00:00Z'}];w.documents=[{id:'d1',family_id:'f1',name:'Document',key:'d',type:'file',status:'pending'}];
  const items=workQueue(w,now);expect(items).toHaveLength(3);expect(items[0].id).toBe('analysis:a1');
  expect(filterWork(items,'late',now).map(i=>i.id)).toEqual(['analysis:a1']);expect(filterWork(items,'waiting',now).map(i=>i.id)).toEqual(['analysis:a1']);expect(filterWork(items,'mine',now).map(i=>i.id)).toEqual(expect.arrayContaining(['meeting:m1','document:d1']));expect(filterWork(items,'approval',now).map(i=>i.id)).toEqual(['document:d1']);
 });
 it('today uses the business timezone, and completed work is excluded',()=>{
  const w=workspace();w.meetings=[{id:'m',family_id:'f1',status:'scheduled',scheduled_at:'2026-10-17T22:30:00Z',type:'phone'},{id:'done',family_id:'f1',status:'completed',scheduled_at:now.toISOString(),type:'phone'}];
  expect(filterWork(workQueue(w,now),'today',now).map(i=>i.id)).toEqual(['meeting:m']);
 });
 it('approval permission and family ownership are both required for the mine filter',()=>{
  const w=workspace();w.documents=[{id:'d',family_id:'f1',name:'Document',key:'d',type:'file',status:'pending'}];w.permissions=[];
  expect(filterWork(workQueue(w,now),'mine',now)).toEqual([]);expect(workQueue(w,now)[0].waiting).toBe(true);
 });
});
