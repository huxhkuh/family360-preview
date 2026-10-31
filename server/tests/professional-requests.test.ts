import {beforeEach,afterEach,test,expect} from 'vitest';
import {fixture} from './fixture';
import {dispatch} from '../src/index';
let f:ReturnType<typeof fixture>,task:any;
const run=async(user:string,name:string,args:any)=>dispatch(f.db,await f.actor(user),await f.db.version(),name,args);
beforeEach(async()=>{f=fixture();task=await run('rep','rpc_send_to_analysis',{p_family_service_id:'fs1',p_professional_id:'p1'});});
afterEach(()=>f.sqlite.close());
const input=()=>({p_id:crypto.randomUUID(),p_task_id:task.id,p_kind:'analysis',p_category:'document',p_details:'Please provide the missing synthetic report.'});
test('request creates one internal representative task and notification without modifying analysis',async()=>{
 const a=input(),before=await f.db.required('analysis_tasks',task.id),notifications=(await f.db.rows('notifications')).length;
 await run('pro','rpc_request_professional_info',a);await run('pro','rpc_request_professional_info',a);
 expect(await f.db.rows('professional_requests')).toHaveLength(1);
 const work=await f.db.required('family_tasks','info:'+a.p_id);expect(work).toMatchObject({owner_role:'representative',visible_to_client:false,status:'open',details:a.p_details});
 expect(await f.db.required('analysis_tasks',task.id)).toEqual(before);expect(await f.db.rows('notifications')).toHaveLength(notifications+1);
 const client:any=await run('client','rpc_workspace',{});expect(client.familyTasks).toEqual([]);
 await run('rep','rpc_set_family_task_status',{p_id:work.id,p_status:'completed',p_expected_revision:1});
 expect(await run('pro','rpc_list_professional_requests',a)).toMatchObject([{status:'completed'}]);
});
test.each(['otherpro','client','marketer'])('%s cannot read or create requests for the task',async user=>{
 await expect(run(user,'rpc_request_professional_info',input())).rejects.toThrow('PERMISSION_DENIED');
 await expect(run(user,'rpc_list_professional_requests',input())).rejects.toThrow('PERMISSION_DENIED');
});
test('id reuse with changed content conflicts and cannot overwrite a request',async()=>{
 const a=input();await run('pro','rpc_request_professional_info',a);
 await expect(run('pro','rpc_request_professional_info',{...a,p_details:'Different content'})).rejects.toThrow('CONFLICT');
 expect((await f.db.required('professional_requests',a.p_id)).details).toBe(a.p_details);
});
test('inactive representative and completed analysis cannot receive new requests',async()=>{
 f.sqlite.exec("UPDATE representatives SET active=0 WHERE id='r1'");
 await expect(run('pro','rpc_request_professional_info',input())).rejects.toThrow('NO_ACTIVE_REPRESENTATIVE');
 expect(await f.db.rows('family_tasks')).toHaveLength(0);
 f.sqlite.exec("UPDATE representatives SET active=1 WHERE id='r1'");
 f.sqlite.prepare("UPDATE analysis_tasks SET status='approved' WHERE id=?").run(task.id);
 await expect(run('pro','rpc_request_professional_info',input())).rejects.toThrow('INVALID_STATE');
});
test('execution requests use the same internal workflow and reject reassigned tasks',async()=>{
 f.insert('execution_tasks',{id:'e1',task_number:'EX-1',family_id:'f1',family_service_id:'fs1',service_id:'s1',professional_id:'p1',status:'execution_in_progress'});
 f.sqlite.exec("UPDATE family_services SET execution_task_id='e1' WHERE id='fs1'");
 const a={...input(),p_kind:'execution',p_task_id:'e1',p_category:'instruction'};
 await run('pro','rpc_request_professional_info',a);expect(await run('pro','rpc_list_professional_requests',a)).toHaveLength(1);
 f.sqlite.exec("UPDATE execution_tasks SET status='reassigned' WHERE id='e1'");
 await expect(run('pro','rpc_request_professional_info',{...a,p_id:crypto.randomUUID()})).rejects.toThrow('INVALID_STATE');
});

test('a superseded analysis cannot create a request',async()=>{f.sqlite.exec("UPDATE family_services SET analysis_task_id=NULL WHERE id='fs1'");await expect(run('pro','rpc_request_professional_info',input())).rejects.toThrow('INVALID_STATE');});
test('representative response is private, revision checked, and delivered once to professional',async()=>{
 const a=input();await run('pro','rpc_request_professional_info',a);
 const answer={...a,p_request_id:a.p_id,p_response:'The synthetic report has been checked.',p_expected_revision:1};
 await expect(run('pro','rpc_respond_professional_info',answer)).rejects.toThrow('PERMISSION_DENIED');
 await expect(run('otherrep','rpc_respond_professional_info',answer)).rejects.toThrow('PERMISSION_DENIED');
 await expect(run('rep','rpc_respond_professional_info',{...answer,p_expected_revision:0})).rejects.toThrow('CONFLICT');
 const before=(await f.db.rows('notifications')).length;
 await run('rep','rpc_respond_professional_info',answer);await run('rep','rpc_respond_professional_info',answer);
 expect(await f.db.rows('notifications')).toHaveLength(before+1);
 expect(await run('pro','rpc_list_professional_requests',a)).toMatchObject([{response:answer.p_response,status:'completed',revision:2}]);
 const workspace:any=await run('rep','rpc_workspace',{});expect(workspace.familyTasks[0]).toMatchObject({professional_task_id:task.id,professional_task_kind:'analysis'});
 const client:any=await run('client','rpc_workspace',{});expect(client.familyTasks).toHaveLength(0);
});

test('internal requests cannot be rewritten or exposed using the ordinary task editor',async()=>{const a=input();await run('pro','rpc_request_professional_info',a);await expect(run('rep','rpc_save_family_task',{p_id:'info:'+a.p_id,p_family_id:'f1',p_expected_revision:1,p_payload:{title:'Expose request',details:'Different content',owner_role:'client',visible_to_client:true,due_on:'2026-10-30'}})).rejects.toThrow('INVALID_STATE');expect((await f.db.required('family_tasks','info:'+a.p_id)).visible_to_client).toBe(false);});
