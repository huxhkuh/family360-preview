import {afterEach,describe,expect,it} from 'vitest';
import {documentUrl,loadMortgageFamilyExample,loadWorkspace,resetDemo,rpc,selectRole} from './backend';

afterEach(()=>{resetDemo();selectRole('representative');});
describe('mortgage presentation demo',()=>{
 it('provides a scoped professional case with editable findings and three real PDF links',async()=>{
  const taskId=loadMortgageFamilyExample();const workspace=await loadWorkspace();
  expect(workspace.profile.role).toBe('professional');
  const task=workspace.analysisTasks.find(t=>t.id===taskId)!;
  expect(task.status).toBe('in_progress');expect(task.snapshot!.length).toBeGreaterThan(8);
  expect(task.client_summary).toContain('הדגמה');
  const documents=workspace.documents.filter(d=>d.family_id===task.family_id);
  expect(documents).toHaveLength(3);
  for(const doc of documents){expect(doc.status).toBe('approved');expect(await documentUrl(doc.storage_path!)).toMatch(/demo-mortgage\/(balance|income|review)\.pdf$/);}
  selectRole('client');await expect(documentUrl(documents[0].storage_path!)).rejects.toThrow('DEMO_UNAVAILABLE');
 });
 it('submits to the representative, who can review and return the findings',async()=>{
  const taskId=loadMortgageFamilyExample();const workspace=await loadWorkspace();
  const task=workspace.analysisTasks.find(t=>t.id===taskId)!;
  await rpc('rpc_submit_analysis',{p_task_id:taskId,p_payload:{financial:task.financial,current_situation:task.current_situation,recommendation:task.recommendation,client_summary:task.client_summary,result_tone:task.result_tone}});
  selectRole('representative');const after=await loadWorkspace();
  expect(after.familyServices.find(s=>s.id===task.family_service_id)?.status).toBe('analysis_received');
  await rpc('rpc_return_analysis',{p_family_service_id:task.family_service_id,p_reason:'נבקש הצעת בנק מפורטת לפני המשך.'});
  selectRole('professional');expect((await loadWorkspace()).analysisTasks.find(t=>t.id===taskId)?.status).toBe('returned');
 });
 it('reopening the scenario restores a single complete case',async()=>{
  loadMortgageFamilyExample();loadMortgageFamilyExample();
  const workspace=await loadWorkspace();expect(workspace.analysisTasks.filter(t=>t.id==='a-mortgage-demo')).toHaveLength(1);
  expect(workspace.documents.filter(d=>d.family_id==='f-mortgage-demo')).toHaveLength(3);
 });
});
