import {test,expect} from 'vitest';
import {fixture} from './fixture';
import {dispatch} from '../src/index';

test('a newly registered client keeps the referral and can resume a saved questionnaire',async()=>{
 const f=fixture();
 try{
  f.insert('profiles',{id:'newclient',auth_user_id:'newclient',name:'Synthetic client',role:'client',active:1,email:'client@example.invalid'});
  const run=async(user:string,name:string,args:Record<string,unknown>={})=>dispatch(f.db,await f.actor(user),await f.db.version(),name,args);
  const family:any=await run('newclient','rpc_open_client_case',{p_name:'Synthetic family',p_phone:'0500000000',p_referral_code:'test-code'});
  expect((await f.db.rows('referrals','family_id=?',[family.id]))[0].partner_id).toBe('partner');
  const initial=await f.db.required('families',family.id);
  await run('newclient','rpc_save_family',{p_family_id:family.id,p_expected_updated_at:initial.updated_at,p_patch:{answers:{city:'Synthetic city'}}});
  const reopened:any=await run('newclient','rpc_workspace');
  expect(reopened.families.find((row:any)=>row.id===family.id).answers.city).toBe('Synthetic city');
  await expect(run('otherclient','rpc_family_workspace',{p_family_id:family.id})).rejects.toThrow('PERMISSION_DENIED');
 }finally{f.sqlite.close();}
});
