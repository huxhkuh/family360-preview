import {beforeEach,describe,expect,it} from 'vitest';
import {clientReadyToWait} from '../ClientCompletion';
import {loadWorkspace,resetDemo,selectRole,startClientIntake,rpc} from './backend';
import {validDemoAnswers} from '../families/questionnaire-fixture';
beforeEach(()=>{resetDemo();selectRole('client');});
async function waiting(){
 const w=await loadWorkspace();w.families[0].onboarding_pct=100;
 w.documents.forEach(d=>d.status='pending');w.familyTasks=[];w.followUps=[];
 return w;
}
describe('honest completion feedback',()=>{
 it('only celebrates submitted answers and documents with no client action remaining',async()=>{
  const w=await waiting(),f=w.families[0];expect(clientReadyToWait(f,w)).toBe(true);
  for(const status of ['approved','signed']){w.documents.forEach(d=>d.status=status);expect(clientReadyToWait(f,w)).toBe(true);}
  for(const status of ['missing','rejected','unknown']){w.documents[0].status=status;expect(clientReadyToWait(f,w)).toBe(false);}
  w.documents=[];expect(clientReadyToWait(f,w)).toBe(true);
 });
 it('withholds completion for drafts, closed cases or incomplete loaded work',async()=>{
  const w=await waiting(),f=w.families[0];
  expect(clientReadyToWait({...f,onboarding_pct:0},w)).toBe(false);
  for(const status of ['completed','archived'])expect(clientReadyToWait({...f,status},w)).toBe(false);
  expect(clientReadyToWait(f,{...w,familyWorkTruncated:true})).toBe(false);
  expect(clientReadyToWait(f,{...w,followUpsTruncated:true})).toBe(false);
 });
 it('blocks open client tasks and visible follow-ups, but allows representative work',async()=>{
  const original=await loadWorkspace(),w=await waiting(),f=w.families[0];
  const task={...original.familyTasks[0],family_id:f.id,visible_to_client:true,owner_role:'client' as const,status:'open' as const};
  w.familyTasks=[task];expect(clientReadyToWait(f,w)).toBe(false);
  w.familyTasks=[{...task,owner_role:'representative'}];expect(clientReadyToWait(f,w)).toBe(true);
  w.followUps=[{...original.followUps[0],family_id:f.id,item_id:null,visible_to_client:true,owner_role:'client',status:'in_progress'}];expect(clientReadyToWait(f,w)).toBe(false);
  w.followUps[0].status='completed';expect(clientReadyToWait(f,w)).toBe(true);
 });
 it('submission does not fabricate a document requirement; optional preparation does not block',async()=>{
  startClientIntake();let w=await loadWorkspace();
  await rpc('rpc_save_family',{p_family_id:'f1',p_patch:{answers:validDemoAnswers},p_expected_updated_at:w.families[0].updated_at});
  await rpc('rpc_complete_onboarding',{p_family_id:'f1'});w=await loadWorkspace();
  expect(clientReadyToWait(w.families[0],w)).toBe(true);expect(w.documents).toHaveLength(0);
  await rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'clearinghouse_auth_h'});w=await loadWorkspace();
  expect(w.documents[0]).toMatchObject({optional:true,type:'signature',status:'missing'});
  expect(clientReadyToWait(w.families[0],w)).toBe(true);
 });
});
