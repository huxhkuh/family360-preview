import {beforeEach,afterEach,test,expect} from 'vitest';
import {fixture} from './fixture';
import {dispatch} from '../src/index';
import {documentAccess} from '../src/auth';
import {upload} from '../src/documents';
import {Context} from '../src/context';
let f:ReturnType<typeof fixture>;
beforeEach(()=>{f=fixture();});afterEach(()=>f.sqlite.close());
const run=async(user:string,name:string,args:Record<string,unknown>={})=>dispatch(f.db,await f.actor(user),await f.db.version(),name,args);

test('invalid draft contact does not replace the usable contact; registration rejects alphabetic phones',async()=>{
 const family=await f.db.required('families','f1');
 await run('client','rpc_save_family',{p_family_id:'f1',p_patch:{answers:{h_phone:'1234567'}},p_expected_updated_at:family.updated_at});
 expect((await f.db.required('families','f1')).phone).toBe('0500000000');
 f.insert('profiles',{id:'newclient',auth_user_id:'newclient',name:'Synthetic client',role:'client',active:1,email:'new@example.invalid'});
 await expect(run('newclient','rpc_open_client_case',{p_name:'Synthetic family',p_phone:'abcdefghi'})).rejects.toThrow('VALIDATION');
 const opened:any=await run('newclient','rpc_open_client_case',{p_name:'Synthetic family',p_phone:'+1 202 555 0123'});expect(opened.phone).toBe('+1 202 555 0123');
});

test('help and correction requests persist once and remain visible to their client',async()=>{
 const args={p_id:'help-request',p_family_id:'f1',p_kind:'help',p_details:'Synthetic help request'};
 await run('client','rpc_client_request',args);await run('client','rpc_client_request',args);
 f.insert('family_tasks',{id:'completed-task',family_id:'f1',title:'Synthetic completed task',details:'Synthetic',owner_role:'client',visible_to_client:true,status:'completed',revision:1,due_on:'2030-01-01',created_by:'rep',updated_by:'rep'});
 await run('client','rpc_client_request',{p_id:'correction-request',p_family_id:'f1',p_kind:'correction',p_details:'Marked complete in error, please review.',p_source_kind:'familyTask',p_source_id:'completed-task',p_expected_revision:1});
 expect(await f.db.rows('family_tasks',"request_kind='help'")).toHaveLength(1);
 const w:any=await run('client','rpc_workspace');expect(w.familyTasks.find((t:any)=>t.id==='correction-request')).toBeDefined();
 expect((await f.db.required('family_tasks','completed-task')).status).toBe('completed');
});

test('client projections exclude questionnaire review notes while staff retain them',async()=>{
 f.sqlite.prepare('UPDATE families SET questionnaire_reviews=? WHERE id=?').run(JSON.stringify({city:{token:'t',note:'STAFF_ONLY_REVIEW'}}),'f1');
 expect(JSON.stringify(await run('client','rpc_workspace'))).not.toContain('STAFF_ONLY_REVIEW');
 expect(JSON.stringify(await run('client','rpc_family_workspace',{p_family_id:'f1'}))).not.toContain('STAFF_ONLY_REVIEW');
 expect(JSON.stringify(await run('rep','rpc_workspace'))).toContain('STAFF_ONLY_REVIEW');
});

test('client mutation responses do not disclose internal case notes',async()=>{
 f.sqlite.prepare('UPDATE families SET questionnaire_reviews=? WHERE id=?').run(JSON.stringify({city:{token:'t',note:'STAFF_ONLY_REVIEW'}}),'f1');
 const family=await f.db.required('families','f1');
 const saved=await run('client','rpc_save_family',{p_family_id:'f1',p_patch:{name:'Synthetic edit'},p_expected_updated_at:family.updated_at});
 expect(JSON.stringify(saved)).not.toContain('PRIVATE NOTE');expect(JSON.stringify(saved)).not.toContain('STAFF_ONLY_REVIEW');
 expect(JSON.stringify(await run('client','rpc_open_client_case',{}))).not.toContain('PRIVATE NOTE');
});

test('replacing an approved document revokes grants until the replacement is reviewed and shared again',async()=>{
 const task:any=await run('rep','rpc_send_to_analysis',{p_family_service_id:'fs1',p_professional_id:'p1'});
 f.sqlite.exec("UPDATE documents SET status='approved' WHERE id='d1'");
 await run('rep','rpc_share_document',{p_document_id:'d1',p_task_id:task.id,p_kind:'analysis'});
 const env={DOCUMENTS:{put:async()=>{}}} as any;
 const req=new Request('https://api.invalid/api/documents/d1',{method:'PUT',headers:{'content-type':'application/pdf','x-file-name':'replacement.pdf'},body:new TextEncoder().encode('%PDF-1.7 synthetic replacement')});
 await upload(new Context(f.db,await f.actor('rep'),await f.db.version()),env,req,'d1');
 await expect(documentAccess(f.db,await f.actor('pro'),'d1')).rejects.toThrow('PERMISSION_DENIED');
 await run('rep','rpc_review_document',{p_document_id:'d1',p_approved:true});
 await expect(documentAccess(f.db,await f.actor('pro'),'d1')).rejects.toThrow('PERMISSION_DENIED');
 await run('rep','rpc_share_document',{p_document_id:'d1',p_task_id:task.id,p_kind:'analysis'});
 expect((await documentAccess(f.db,await f.actor('pro'),'d1')).status).toBe('approved');
});

test.each(['cancelled','reassigned'])('a %s task cannot grant document access or expose documents in the workspace',async status=>{
 f.sqlite.exec("UPDATE documents SET status='approved' WHERE id='d1'");
 f.insert('execution_tasks',{id:'e1',task_number:'EX-1',family_id:'f1',family_service_id:'fs1',service_id:'s1',professional_id:'p1',status});
 f.insert('task_documents',{id:'share',document_id:'d1',execution_task_id:'e1',shared_by:'rep'});
 await expect(documentAccess(f.db,await f.actor('pro'),'d1')).rejects.toThrow('PERMISSION_DENIED');
 const w:any=await run('pro','rpc_workspace');expect(w.documents).toEqual([]);
});

test.each(['manage','action'])('cancelling through %s restores approved findings to the next meeting',async route=>{
 const task:any=await run('rep','rpc_send_to_analysis',{p_family_service_id:'fs1',p_professional_id:'p1'});
 await run('pro','rpc_submit_analysis',{p_task_id:task.id,p_payload:{current_situation:'Synthetic situation',recommendation:'Synthetic recommendation',client_summary:'Synthetic summary',result_tone:'green'}});
 await run('rep','rpc_approve_analysis',{p_family_service_id:'fs1'});
 const meeting:any=await run('rep','rpc_schedule_meeting',{p_family_id:'f1',p_scheduled_at:'2030-01-01T10:00:00Z',p_type:'phone'});
 await run('rep',route==='manage'?'rpc_manage_meeting':'rpc_meeting_action',{p_meeting_id:meeting.id,p_action:'cancel',p_expected_scheduled_at:meeting.scheduled_at,p_reason:'Synthetic cancellation',p_payload:{reason:'Synthetic cancellation'}});
 expect((await f.db.required('family_services','fs1')).status).toBe('approved_analysis');
 expect((await f.db.required('families','f1')).status).toBe('ready_meeting');
 const next:any=await run('rep','rpc_schedule_meeting',{p_family_id:'f1',p_scheduled_at:'2030-01-02T10:00:00Z',p_type:'phone'});
 expect(await f.db.rows('meeting_items','meeting_id=?',[next.id])).toHaveLength(1);
});
