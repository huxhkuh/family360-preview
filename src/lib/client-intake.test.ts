import {beforeEach,describe,expect,it} from 'vitest';
import {clientIntake} from './client-intake';
import {loadWorkspace,resetDemo,rpc,selectRole,startClientIntake,registerClientIntake} from './backend';
import {validDemoAnswers} from '../families/questionnaire-fixture';

beforeEach(()=>{resetDemo();selectRole('client');});
describe('client intake guidance and demo boundaries',()=>{
 it('starts with an unsubmitted questionnaire and preserves the existing demo separately',async()=>{
  const existing=await loadWorkspace();expect(existing.families[0].status).toBe('meeting_done');
  startClientIntake();const w=await loadWorkspace();const flow=clientIntake(w.families[0],w);
  expect(flow.stage).toBe(1);expect(flow.submitted).toBe(false);expect(flow.action.target).toBe('questionnaire');expect(w.followUps).toEqual([]);
 });
 it('does not call empty document requests approved or complete',async()=>{
  startClientIntake();const w=await loadWorkspace();w.families[0].onboarding_pct=100;w.families[0].status='waiting_docs';
  const flow=clientIntake(w.families[0],w);expect(flow.documents).toHaveLength(0);expect(flow.action.title).toBe('הנציג בודק מה נדרש להמשך');
 });
 it('moves an example through request, review, rejection and resubmission without uploading',async()=>{
  startClientIntake();const initial=await loadWorkspace();await rpc('rpc_save_family',{p_family_id:'f1',p_expected_updated_at:initial.families[0].updated_at,p_patch:{answers:validDemoAnswers}});await rpc('rpc_complete_onboarding',{p_family_id:'f1'});selectRole('representative');await rpc('rpc_request_document',{p_family_id:'f1',p_type_id:'dt1'});selectRole('client');let w=await loadWorkspace();
  expect(clientIntake(w.families[0],w).stage).toBe(2);const doc=w.documents[0];
  await rpc('rpc_demo_attach_example',{p_document_id:doc.id});w=await loadWorkspace();
  expect(clientIntake(w.families[0],w).action.title).toBe('המסמכים אצל הנציג לבדיקה');expect(w.documents[0].storage_path).toBeUndefined();
  await expect(rpc('rpc_demo_attach_example',{p_document_id:doc.id})).rejects.toThrow('VALIDATION');
  selectRole('representative');await rpc('rpc_review_document',{p_document_id:doc.id,p_approved:false,p_reason:'נדרשת דוגמה מתוקנת'});
  selectRole('client');w=await loadWorkspace();expect(clientIntake(w.families[0],w).stage).toBe(2);
  await rpc('rpc_demo_attach_example',{p_document_id:doc.id});w=await loadWorkspace();expect(w.documents[0].reject_reason).toBeNull();
 });
 it('rejects document simulation and onboarding changes outside the client scope',async()=>{
  await expect(rpc('rpc_demo_attach_example',{p_document_id:'d2'})).rejects.toThrow('PERMISSION_DENIED');
  await expect(rpc('rpc_complete_onboarding',{p_family_id:'f2'})).rejects.toThrow('PERMISSION_DENIED');
  selectRole('professional');await expect(rpc('rpc_demo_attach_example',{p_document_id:'d2'})).rejects.toThrow('PERMISSION_DENIED');
 });
 it('keeps closed cases and follow-up work visible instead of claiming the client can only wait',async()=>{
  const w=await loadWorkspace();expect(clientIntake(w.families[0],w).action.target).toBe('documents');
  w.documents.forEach(d=>d.status='approved');expect(clientIntake(w.families[0],w).action.target).toBe('followups');
  w.families[0].status='archived';w.families[0].onboarding_pct=0;
  expect(clientIntake(w.families[0],w)).toMatchObject({terminal:true,action:{title:'התיק בארכיון'}});
 });
});

describe('customer registration at checkout',()=>{
 it('creates the client identity and seeds questionnaire contact details',async()=>{registerClientIntake({first:'ישראל',last:'לדוגמה',email:'DEMO@example.invalid',phone:'0500000000'});const w=await loadWorkspace();expect(w.profile.name).toBe('ישראל לדוגמה');expect(w.profile.email).toBe('demo@example.invalid');expect(w.families[0].answers).toMatchObject({h_first:'ישראל',h_last:'לדוגמה',h_email:'demo@example.invalid',h_phone:'0500000000'});expect(w.families[0].onboarding_pct).toBe(0);});
 it('rejects invalid signup without resetting existing client work',async()=>{const before=await loadWorkspace();expect(()=>registerClientIntake({first:'ישראל',last:'לדוגמה',email:'invalid',phone:'123'})).toThrow();expect((await loadWorkspace()).families).toEqual(before.families);});
});
