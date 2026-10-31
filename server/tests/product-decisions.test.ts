import {test,expect} from 'vitest';
import {fixture} from './fixture';
import {dispatch} from '../src/index';
import {supportClosed} from '../../src/lib/case-policy';
test('professional handoff is blocked until an authorized representative confirms the conversation',async()=>{
 const f=fixture();try{
  f.sqlite.exec("DELETE FROM timeline_events WHERE id='intro:f1'");
  const run=async(user:string,name:string,args:any)=>dispatch(f.db,await f.actor(user),await f.db.version(),name,args);
  const args={p_family_service_id:'fs1',p_professional_id:'p1'};
  await expect(run('rep','rpc_send_to_analysis',args)).rejects.toThrow('CALL_REQUIRED');
  await expect(run('client','rpc_confirm_representative_call',{p_family_id:'f1',p_confirmed:true})).rejects.toThrow('PERMISSION_DENIED');
  await run('rep','rpc_confirm_representative_call',{p_family_id:'f1',p_confirmed:true});
  expect(await run('rep','rpc_send_to_analysis',args)).toMatchObject({family_id:'f1'});
 }finally{f.sqlite.close();}
});
test('support remains open for seven days after final approval and closes at the boundary',()=>{
 const at=Date.parse('2030-01-01T00:00:00Z'),reports=[{status:'approved',snapshot:{approved_at:new Date(at).toISOString()}}];
 expect(supportClosed('completed',reports,at+7*86400000-1)).toBe(false);
 expect(supportClosed('completed',reports,at+7*86400000)).toBe(true);
 expect(supportClosed('in_progress',reports,at+8*86400000)).toBe(false);
 expect(supportClosed('completed',[{status:'draft'}],at+8*86400000)).toBe(false);
});
