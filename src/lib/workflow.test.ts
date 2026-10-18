import {describe,it,expect} from 'vitest';
import {nextStep} from './workflow';
import {workspaceSchema,type Family} from './model';
import {missingAnswers} from '../families/questionnaire-validation';
const family:Family={id:'f1',name:'Test',case_number:'1',status:'new'};
function workspace(role='client'){
 return workspaceSchema.parse({profile:{id:'p1',name:'Test',active:true,role},permissions:['*'],families:[family],services:[],familyServices:[],documents:[],analysisTasks:[],executionTasks:[],meetings:[],meetingItems:[],professionals:[],professionalServices:[],representatives:[],profiles:[],notifications:[],timeline:[],audit:[],settings:{},automations:[],templates:[],documentTypes:[],limit:500});
}
describe('role-specific next action',()=>{
 it('shows the responsible person and deadline instead of claiming nothing remains after a meeting',()=>{
  const w=workspace();w.followUps=[{id:'fu',meeting_id:'m',family_id:'f1',item_id:null,title:'להעלות דוח',details:'לצרף את הדוח לתיק',owner_role:'client',owner_name:'משפחת בדיקה',due_on:'2030-01-15',visible_to_client:true,status:'open',revision:1,updated_at:'2026-01-01T00:00:00Z'}];
  const f={...family,status:'meeting_done',onboarding_pct:100};
  expect(nextStep(f,w)).toMatchObject({title:'להעלות דוח',target:'followups',actionable:true});expect(nextStep(f,w).owner).toContain('משפחת בדיקה');
  w.profile.role='representative';expect(nextStep(f,w).actionable).toBe(false);
  w.followUps[0].status='completed';expect(nextStep(f,w).target).not.toBe('followups');
 });
 it('directs an incomplete client to the questionnaire without interpreting absent tasks as completion',()=>{
  const step=nextStep(family,workspace());expect(step.target).toBe('questionnaire');expect(step.owner).toBe('אתם');expect(step.actionable).toBe(true);
 });
 it('a pending document belongs to the representative, not the client',()=>{
  const w=workspace();w.documents=[{id:'d1',family_id:'f1',name:'Test',key:'test',type:'file',status:'pending'}];
  const f={...family,status:'waiting_docs',onboarding_pct:100};expect(nextStep(f,w).actionable).toBe(false);
  w.profile.role='representative';expect(nextStep(f,w).actionable).toBe(true);expect(nextStep(f,w).target).toBe('documents');
 });
 it('missing documents in a different family never affect guidance',()=>{
  const w=workspace();w.documents=[{id:'d2',family_id:'other',name:'Other',key:'test',type:'file',status:'missing'}];
  expect(nextStep({...family,status:'waiting_docs',onboarding_pct:100},w).target).toBe('services');
 });
 it('representative reviews uploaded documents while the client completes missing ones',()=>{
  const w=workspace();w.documents=[{id:'d1',family_id:'f1',name:'Missing',key:'one',type:'file',status:'missing'},{id:'d2',family_id:'f1',name:'Pending',key:'two',type:'file',status:'pending'}];
  const f={...family,status:'waiting_docs',onboarding_pct:100};expect(nextStep(f,w).label).toBe('למסמכים המבוקשים');
  w.profile.role='representative';expect(nextStep(f,w).label).toBe('בדיקת המסמכים');
 });
 it('approved execution is assigned before a new meeting is suggested',()=>{
  const w=workspace('representative');w.familyServices=[{id:'s1',family_id:'f1',service_id:'svc',status:'client_approved_execution',analysis_task_id:null,execution_task_id:null}];
  expect(nextStep({...family,status:'meeting_done',onboarding_pct:100},w)).toMatchObject({stage:4,target:'services',actionable:true});
 });
 it('in-progress meetings take priority over an already-approved analysis',()=>{
  const w=workspace();w.meetings=[{id:'m1',family_id:'f1',status:'in_progress',scheduled_at:null,type:'phone'}];
  expect(nextStep({...family,status:'ready_meeting',onboarding_pct:100},w).target).toBe('meetings');
 });
 it('archived and completed cases do not ask users to fill questionnaires again',()=>{
  expect(nextStep({...family,status:'archived'},workspace()).stage).toBe(-1);
  expect(nextStep({...family,status:'completed'},workspace())).toMatchObject({stage:4,actionable:false,target:'services'});
 });
 it('a client with no tasks sees a waiting explanation, not a fabricated success',()=>{
  const step=nextStep({...family,status:'waiting_docs',onboarding_pct:100},workspace());expect(step.actionable).toBe(false);expect(step.owner).toBe('הנציג המטפל');
 });
});
describe('questionnaire missing fields',()=>{
 it('accepts zero, excludes hidden spouse, mortgage and employer fields',()=>{
  const missing=missingAnswers({marital:'single',h_emp:'none',housing:'family',bank_count:0},[]).map(m=>m.key);
  expect(missing).not.toContain('bank_count');expect(missing).not.toContain('w_first');expect(missing).not.toContain('mort_bank');expect(missing).not.toContain('h_work');expect(missing).toContain('h_first');
 });
 it('points conditional questions to their chapter',()=>{
  expect(missingAnswers({housing:'own',has_mortgage:'yes'},[])).toContainEqual({key:'mort_bank',label:'משכנתא · פרטי המשכנתא: הבנק',chapter:'mortgage'});
 });
 it('includes only visible required custom service fields',()=>{
  const w=workspace();w.services=[{id:'s1',key:'s1',name:'Custom',active:true,trigger_conditions:[],client_fields:[{key:'extra',label:'Extra',type:'text',required:true,show_when:{field:'h_emp',op:'equals',value:'self'}}],professional_fields:[],required_documents:[]}];
  expect(missingAnswers({h_emp:'none'},w.services).some(m=>m.key==='extra')).toBe(false);
  expect(missingAnswers({h_emp:'self'},w.services)).toContainEqual({key:'extra',label:'Custom: Extra',chapter:'custom'});
 });
});
