import {beforeEach,afterEach,test,expect} from 'vitest';
import {fixture} from './fixture';
import {dispatch} from '../src/index';
let f:ReturnType<typeof fixture>;
beforeEach(()=>{f=fixture();}); afterEach(()=>f.sqlite.close());
const run=async(user:string,name:string,args:Record<string,unknown>)=>dispatch(f.db,await f.actor(user),await f.db.version(),name,args);
const create=(user='rep',family='f1',phone='0501234567')=>run(user,'rpc_create_telephone_binding',{p_family_id:family,p_phone:phone,p_verified:true});
test('staff can verify and revoke a number with audit and existing client preserved',async()=>{
 const {id}=await create() as {id:string};
 expect((await f.db.required('families','f1')).client_profile_id).toBe('client');
 expect(await run('rep','rpc_list_telephone_bindings',{p_family_id:'f1'})).toMatchObject([{id,phone:'+972501234567'}]);
 await run('rep','rpc_revoke_telephone_binding',{p_family_id:'f1',p_id:id});
 expect(await run('rep','rpc_list_telephone_bindings',{p_family_id:'f1'})).toEqual([]);
 expect((await f.db.rows('audit_log',"entity_type='telephone_binding'")).length).toBe(2);
});
test('creates an internal client for an offline family without an account',async()=>{
 f.sqlite.exec("UPDATE families SET client_profile_id=NULL WHERE id='f1'");
 await create(); const family=await f.db.required('families','f1'); const client=await f.db.required('profiles',family.client_profile_id);
 expect(client.role).toBe('client'); expect(client.auth_user_id).toBeNull(); expect(client.active).toBe(true);
});
test('rejects clients, unrelated staff and unverified numbers',async()=>{
 await expect(create('client')).rejects.toThrow('PERMISSION_DENIED');
 await expect(create('otherrep')).rejects.toThrow('PERMISSION_DENIED');
 await expect(run('rep','rpc_create_telephone_binding',{p_family_id:'f1',p_phone:'0501234567',p_verified:false})).rejects.toThrow('VALIDATION');
 expect(await run('rep','rpc_list_telephone_bindings',{p_family_id:'f1'})).toEqual([]);
});
test('shared numbers cannot be bound to different families or leak their messages',async()=>{
 await create(); await expect(create('otherrep','f2')).rejects.toThrow();
 await expect(run('otherrep','rpc_list_telephone_messages',{p_family_id:'f1'})).rejects.toThrow('PERMISSION_DENIED');
});
