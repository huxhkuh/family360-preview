import {test,expect} from 'vitest';
import {resetDemo,selectRole,rpc,loadWorkspace} from './backend';
test('demo cancellation preserves findings for a replacement meeting',async()=>{
 resetDemo();selectRole('admin');
 const task:any=await rpc('rpc_send_to_analysis',{p_family_service_id:'fs2',p_professional_id:'pro1'});
 selectRole('professional');await rpc('rpc_submit_analysis',{p_task_id:task.id,p_payload:{current_situation:'Current synthetic',recommendation:'Proposed synthetic',client_summary:'Summary synthetic',result_tone:'green'}});
 selectRole('admin');await rpc('rpc_approve_analysis',{p_family_service_id:'fs2'});
 const meeting:any=await rpc('rpc_schedule_meeting',{p_family_id:'f2',p_scheduled_at:'2030-01-01T10:00:00Z',p_type:'phone'});
 await rpc('rpc_manage_meeting',{p_meeting_id:meeting.id,p_expected_scheduled_at:meeting.scheduled_at,p_action:'cancel',p_reason:'Synthetic cancellation'});
 expect((await loadWorkspace()).familyServices.find(f=>f.id==='fs2')?.status).toBe('approved_analysis');
 const next:any=await rpc('rpc_schedule_meeting',{p_family_id:'f2',p_scheduled_at:'2030-01-02T10:00:00Z',p_type:'phone'});
 expect((await loadWorkspace()).meetingItems.filter(i=>i.meeting_id===next.id)).toHaveLength(1);
});
