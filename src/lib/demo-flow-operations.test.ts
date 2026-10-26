import {beforeEach,describe,expect,it} from 'vitest';
import {loadWorkspace,resetDemo,rpc,selectRole} from './backend';
import {operationRpc} from './demo-operations';

beforeEach(()=>{resetDemo();selectRole('representative');});
const payload={current_situation:'המצב הקיים נבדק',recommendation:'חלופה מתאימה למשפחה',client_summary:'סיכום ממצאי הבדיקה',result_tone:'green'};
async function submittedAnalysis(){
 const task=await rpc<{id:string}>('rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'pro1',p_note:'לבדוק את הדוח'});
 selectRole('professional');await rpc('rpc_submit_analysis',{p_task_id:task.id,p_payload:payload});selectRole('representative');return task;
}
describe('complete demo handoffs between roles',()=>{
 it('moves a newly assigned analysis through return, resubmission, meeting and completed execution',async()=>{
  const task=await submittedAnalysis();await rpc('rpc_return_analysis',{p_family_service_id:'fs2',p_reason:'להוסיף פירוט לממצאים'});
  selectRole('professional');expect((await loadWorkspace()).analysisTasks.find(t=>t.id===task.id)?.status).toBe('returned');await rpc('rpc_submit_analysis',{p_task_id:task.id,p_payload:payload});
  selectRole('representative');await rpc('rpc_approve_analysis',{p_family_service_id:'fs2'});
  const meeting=await rpc<{id:string}>('rpc_schedule_meeting',{p_family_id:'f2',p_scheduled_at:'2030-01-01T10:00:00Z',p_type:'phone'});
  let w=await loadWorkspace();const item=w.meetingItems.find(i=>i.meeting_id===meeting.id)!;expect(item).toMatchObject({client_summary:payload.client_summary,current_situation:payload.current_situation,recommendation:payload.recommendation,client_decision:'undecided'});
  await rpc('rpc_meeting_action',{p_meeting_id:meeting.id,p_action:'start'});await rpc('rpc_meeting_action',{p_meeting_id:meeting.id,p_action:'decision',p_payload:{item_id:item.id,client_decision:'progress',execution_instructions:'הנחיות ביצוע מהשיחה',decision_note:'הלקוח אישר'}});await rpc('rpc_finish_meeting',{p_meeting_id:meeting.id});
  const execution=await rpc<{id:string;instructions:string}>('rpc_send_to_execution',{p_family_service_id:'fs2',p_professional_id:'pro1',p_rep_note:'לתאם עם המשפחה',p_document_ids:[]});expect(execution.instructions).toBe('הנחיות ביצוע מהשיחה');
  selectRole('professional');await rpc('rpc_start_execution',{p_task_id:execution.id});await rpc('rpc_report_execution_complete',{p_task_id:execution.id,p_outcome:'הושלם',p_summary:'הפעולה בוצעה ונבדקה',p_value:0});
  selectRole('admin');await rpc('rpc_approve_execution',{p_task_id:execution.id});w=await loadWorkspace();expect(w.familyServices.find(s=>s.id==='fs2')?.status).toBe('completed');
 });
 it('rejects unauthorized, duplicate and ineligible handoffs without creating tasks',async()=>{
  selectRole('client');await expect(rpc('rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'pro1'})).rejects.toThrow('PERMISSION_DENIED');
  selectRole('representative');await expect(rpc('rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'absent'})).rejects.toThrow('INELIGIBLE_PROFESSIONAL');expect((await loadWorkspace()).familyServices.find(s=>s.id==='fs2')?.status).toBe('waiting_analysis');
  await rpc('rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'pro1'});await expect(rpc('rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'pro1'})).rejects.toThrow('INVALID_STATE');expect((await loadWorkspace()).analysisTasks.filter(t=>t.family_service_id==='fs2')).toHaveLength(1);
 });
 it('requires submitted findings, a reason for return and a completed approved decision before execution',async()=>{
  await expect(rpc('rpc_approve_analysis',{p_family_service_id:'fs2'})).rejects.toThrow('INVALID_STATE');await submittedAnalysis();
  await expect(rpc('rpc_return_analysis',{p_family_service_id:'fs2',p_reason:''})).rejects.toThrow('VALIDATION');expect((await loadWorkspace()).familyServices.find(s=>s.id==='fs2')?.status).toBe('analysis_received');
  await expect(rpc('rpc_send_to_execution',{p_family_service_id:'fs2',p_professional_id:'pro1'})).rejects.toThrow('INVALID_STATE');
 });
 it('requires approved findings and prevents duplicate scheduled meetings',async()=>{
  await expect(rpc('rpc_schedule_meeting',{p_family_id:'f2',p_scheduled_at:'bad',p_type:'phone'})).rejects.toThrow('VALIDATION');await expect(rpc('rpc_schedule_meeting',{p_family_id:'f2',p_scheduled_at:'2030-01-01T10:00:00Z',p_type:'phone'})).rejects.toThrow('INVALID_STATE');
  await submittedAnalysis();await rpc('rpc_approve_analysis',{p_family_service_id:'fs2'});const args={p_family_id:'f2',p_scheduled_at:'2030-01-01T10:00:00Z',p_type:'video'};await rpc('rpc_schedule_meeting',args);await expect(rpc('rpc_schedule_meeting',args)).rejects.toThrow('INVALID_STATE');
 });
 it('creates a family only for an active client and representative as administrator',async()=>{
  const args={p_name:'משפחת בדיקה',p_client_profile_id:'client',p_representative_id:'rep1',p_phone:'0500000000',p_email:'test@example.invalid'};
  await expect(rpc('rpc_create_family',args)).rejects.toThrow('PERMISSION_DENIED');selectRole('admin');await expect(rpc('rpc_create_family',{...args,p_client_profile_id:'professional1'})).rejects.toThrow('VALIDATION');const familyId=await rpc<string>('rpc_create_family',args);expect((await loadWorkspace()).families.find(f=>f.id===familyId)).toMatchObject({name:args.p_name,status:'new',onboarding_pct:0,representative_id:'rep1'});
 });
 it('shares only approved documents from the same case and permits revoke',async()=>{
  const task=await rpc<{id:string}>('rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'pro1'});
  const args={p_document_id:'d2',p_task_id:task.id,p_kind:'analysis',p_revoke:false};await expect(rpc('rpc_share_document',args)).rejects.toThrow('INVALID_STATE');
  await rpc('rpc_review_document',{p_document_id:'d2',p_approved:true});const share=await rpc<{id:string;revoked_at:null}>('rpc_share_document',args);expect(share.revoked_at).toBeNull();selectRole('professional');expect((await loadWorkspace()).documents.map(d=>d.id)).toEqual(['d2']);selectRole('representative');await expect(rpc('rpc_share_document',{...args,p_document_id:'d1'})).rejects.toThrow('VALIDATION');
  expect(await rpc('rpc_share_document',{...args,p_revoke:true})).toMatchObject({id:share.id,revoked_at:expect.any(String)});selectRole('professional');expect((await loadWorkspace()).documents).toEqual([]);await expect(rpc('rpc_share_document',args)).rejects.toThrow('PERMISSION_DENIED');
 });
});

describe('demo case permissions and representative reassignment',()=>{
 function state(){return {families:[{id:'f',representative_id:'rep',updated_at:'2026-01-01T00:00:00Z'}],representatives:[{id:'rep',profile_id:'representative',active:true,permissions:['families.edit','analysis.send']}],profiles:[{id:'representative',active:true,role:'representative'}],familyServices:[{id:'fs',family_id:'f',service_id:'s',status:'waiting_analysis'}],audit:[],timeline:[]};}
 it('checks representative ownership and permission before assignment',()=>{
  const data=state();data.families[0].representative_id='someone-else';expect(()=>operationRpc('rpc_send_to_analysis',{p_family_service_id:'fs'},data,'representative')).toThrow('PERMISSION_DENIED');data.families[0].representative_id='rep';data.representatives[0].permissions=[];expect(()=>operationRpc('rpc_send_to_analysis',{p_family_service_id:'fs'},data,'representative')).toThrow('PERMISSION_DENIED');
 });
 it('reassigns with revision protection and validates the active representative profile',()=>{
  const data=state(),args={p_family_id:'f',p_representative_id:'rep',p_expected_updated_at:data.families[0].updated_at};expect(()=>operationRpc('rpc_assign_family_representative',args,data,'representative')).toThrow('PERMISSION_DENIED');expect(()=>operationRpc('rpc_assign_family_representative',{...args,p_expected_updated_at:'old'},data,'admin')).toThrow('CONFLICT');
  data.profiles[0].active=false;expect(()=>operationRpc('rpc_assign_family_representative',args,data,'admin')).toThrow('VALIDATION');data.profiles[0].active=true;expect(operationRpc('rpc_assign_family_representative',args,data,'admin')).toMatchObject({representative_id:'rep'});expect(data.families[0].updated_at).not.toBe(args.p_expected_updated_at);
 });
});
