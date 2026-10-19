import {beforeEach,describe,expect,it} from 'vitest';
import {loadWorkspace,resetDemo,rpc,selectRole,startClientIntake} from './backend';
import {questionnaireIssues} from '../families/questionnaire-validation';
import {validDemoAnswers as valid} from '../families/questionnaire-fixture';
import {questionnaireReview} from '../families/questionnaire-review';
import {notificationTarget} from './client-notifications';

beforeEach(()=>{resetDemo();selectRole('client');});
describe('questionnaire submission integrity',()=>{
 it('accepts valid synthetic values and optional blanks',()=>expect(questionnaireIssues(valid,[])).toEqual([]));
 it.each([['h_id','abc'],['h_email','not-an-email'],['h_phone','call-me'],['h_dob','2099-01-01'],['h_dob','2020-02-31'],['bank_count','-1'],['bank_count','Infinity'],['housing','unknown']])('rejects invalid %s', (key,value)=>expect(questionnaireIssues({...valid,[key]:value},[]).map(i=>i.key)).toContain(key));
 it('checks nested and optional values without validating hidden answers',()=>{
  const issues=questionnaireIssues({...valid,w_id:'abc',mort_balance:'-4',children:[{dob:'2099-01-01'}],loans:[{balance:'-5'}],wt_0:'-1'},[]);
  expect(issues.map(i=>i.key)).toEqual(['children.0.dob','loans.0.balance','wt_0']);
 });
 it('checks visible dynamic service fields',async()=>{
  const w=await loadWorkspace();const service={...w.services[0],active:true,trigger_conditions:[],client_fields:[{key:'custom_email',label:'דוא״ל נוסף',type:'email',required:true}]};
  expect(questionnaireIssues({...valid,custom_email:'bad'},[service])).toMatchObject([{key:'custom_email',chapter:'custom'}]);
 });
 it('reviews current answers with readable choices and hides inapplicable personal details',()=>{
  const review=questionnaireReview({...valid,w_id:'hidden',children:[{name:'ילד לדוגמה'}],wt_0:'1000'},[]);
  expect(JSON.stringify(review)).not.toContain('hidden');expect(JSON.stringify(review)).toContain('לא עובד');expect(JSON.stringify(review)).toContain('1000');
 });
 it('preserves an invalid draft but blocks a direct submit bypass',async()=>{
  startClientIntake();let w=await loadWorkspace();
  await rpc('rpc_save_family',{p_family_id:'f1',p_expected_updated_at:w.families[0].updated_at,p_patch:{answers:{...valid,h_email:'bad',h_id:'abc'}}});
  await expect(rpc('rpc_complete_onboarding',{p_family_id:'f1'})).rejects.toThrow('VALIDATION');
  w=await loadWorkspace();expect(w.families[0].answers?.h_email).toBe('bad');expect(w.families[0].onboarding_pct).toBe(0);expect(w.documents).toEqual([]);
 });
 it('rejects a professional editing a client questionnaire directly',async()=>{selectRole('professional');await expect(rpc('rpc_save_family',{p_family_id:'f1',p_patch:{answers:valid}})).rejects.toThrow('PERMISSION_DENIED');});
});
describe('actionable work and safe client requests',()=>{
 it('links the upload task to an accessible request and requires attachment before completion',async()=>{
  let w=await loadWorkspace();const task=w.followUps.find(t=>t.id==='fu1')!;expect(w.documents.some(d=>d.id===task.document_id&&d.family_id===task.family_id)).toBe(true);
  await expect(rpc('rpc_set_followup_status',{p_id:task.id,p_status:'completed',p_expected_revision:task.revision})).rejects.toThrow('VALIDATION');
  await rpc('rpc_demo_attach_example',{p_document_id:task.document_id});await rpc('rpc_set_followup_status',{p_id:task.id,p_status:'completed',p_expected_revision:task.revision});
  w=await loadWorkspace();expect(w.followUps.find(t=>t.id===task.id)?.status).toBe('completed');expect(w.documents.find(d=>d.id===task.document_id)?.status).toBe('pending');
 });
 it('records a correction request once without reopening or changing the completed task',async()=>{
  await rpc('rpc_set_family_task_status',{p_id:'ft1',p_status:'completed',p_expected_revision:1});
  const args={p_family_id:'f1',p_kind:'correction',p_source_kind:'familyTask',p_source_id:'ft1',p_expected_revision:2};
  await rpc('rpc_client_request',args);await rpc('rpc_client_request',args);
  const w=await loadWorkspace();expect(w.familyTasks.filter(t=>t.request_kind==='correction')).toHaveLength(1);expect(w.familyTasks.find(t=>t.id==='ft1')?.status).toBe('completed');
  await expect(rpc('rpc_set_family_task_status',{p_id:'ft1',p_status:'open',p_expected_revision:2})).rejects.toThrow('PERMISSION_DENIED');
  await expect(rpc('rpc_client_request',{...args,p_expected_revision:1})).rejects.toThrow('CONFLICT');
  selectRole('representative');const staff=await loadWorkspace();expect(staff.familyTasks.some(t=>t.request_kind==='correction'&&t.owner_role==='representative')).toBe(true);
 });
 it('records one pending help request, visible to the representative, without a promised date',async()=>{
  const args={p_family_id:'f1',p_kind:'help',p_details:'צריכים הסבר על הדוח'};await rpc('rpc_client_request',args);await rpc('rpc_client_request',args);
  const w=await loadWorkspace();const tasks=w.familyTasks.filter(t=>t.request_kind==='help');expect(tasks).toHaveLength(1);expect(tasks[0].due_on).toBe('');expect(tasks[0].details).toBe(args.p_details);
 });
 it('rejects cross-family, internal, representative and professional request attempts',async()=>{
  await expect(rpc('rpc_client_request',{p_family_id:'f2',p_kind:'help',p_details:'help'})).rejects.toThrow('PERMISSION_DENIED');
  await expect(rpc('rpc_client_request',{p_family_id:'f1',p_kind:'correction',p_source_kind:'followUp',p_source_id:'fu3',p_expected_revision:1})).rejects.toThrow('PERMISSION_DENIED');
  await expect(rpc('rpc_set_family_task_status',{p_id:'ft1',p_status:'cancelled',p_expected_revision:1})).rejects.toThrow('PERMISSION_DENIED');
  selectRole('professional');await expect(rpc('rpc_set_followup_status',{p_id:'fu1',p_status:'in_progress',p_expected_revision:1})).rejects.toThrow('PERMISSION_DENIED');
  await expect(rpc('rpc_client_request',{p_family_id:'f1',p_kind:'help',p_details:'help'})).rejects.toThrow('PERMISSION_DENIED');
 });
 it('rejects linking a task to another family document',async()=>{selectRole('representative');await expect(rpc('rpc_save_family_task',{p_id:'ft1',p_family_id:'f1',p_payload:{document_id:'d2'},p_expected_revision:1})).rejects.toThrow('VALIDATION');});
 it('opens a document notification only in the correct client workspace',async()=>{
  await rpc('rpc_demo_attach_example',{p_document_id:'d1'});selectRole('representative');await rpc('rpc_review_document',{p_document_id:'d1',p_approved:false,p_reason:'חסר עמוד'});
  let w=await loadWorkspace();expect(w.notifications.some(n=>n.target_id==='d1')).toBe(false);
  selectRole('client');w=await loadWorkspace();const n=w.notifications.find(n=>n.target_id==='d1')!;expect(notificationTarget(n,w)).toEqual({page:'families',id:'f1',tab:'documents',focus:'d1'});
  expect(notificationTarget({...n,family_id:'f2'},w)).toBeUndefined();expect(notificationTarget({...n,target_id:'d2'},w)).toBeUndefined();
 });
 it('keeps marking notices read scoped to the current audience',async()=>{
  await rpc('rpc_client_request',{p_family_id:'f1',p_kind:'help',p_details:'נדרשת עזרה'});await rpc('rpc_mark_notifications_read');
  selectRole('representative');const w=await loadWorkspace();const notice=w.notifications.find(n=>n.target_kind==='familyTask')!;expect(notice.read_at).toBeNull();expect(notificationTarget(notice,w)?.focus).toBe(notice.target_id);
 });
});
