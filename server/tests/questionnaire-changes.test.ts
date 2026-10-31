import {test,expect} from 'vitest';
import {fixture} from './fixture';
import {dispatch} from '../src/index';

test('submitted answer edits notify only the assigned representative and affected professional, atomically',async()=>{
 const f=fixture();try{
  f.sqlite.exec("UPDATE families SET onboarding_pct=100 WHERE id='f1'");
  f.insert('analysis_tasks',{id:'a',task_number:'AN-TEST',family_id:'f1',family_service_id:'fs1',service_id:'s1',professional_id:'p1',snapshot:[{key:'city',label:'City',value:'Old'}]});
  f.insert('analysis_tasks',{id:'old',task_number:'AN-OLD',family_id:'f1',family_service_id:'fs1',service_id:'s1',professional_id:'p2',status:'reassigned',snapshot:[{key:'city',value:'Old'}]});
  const save=async(answers:object,revision?:string)=>dispatch(f.db,await f.actor('client'),await f.db.version(),'rpc_save_family',{p_family_id:'f1',p_expected_updated_at:revision??(await f.db.required('families','f1')).updated_at,p_patch:{answers}});
  const old=(await f.db.required('families','f1')).updated_at;
  await save({city:'PRIVATE NEW CITY',children:[{name:'A',age:1}]});
  let notes=await f.db.rows('notifications');expect(notes.map(n=>n.profile_id).sort()).toEqual(['pro','rep']);
  expect(JSON.stringify(notes)).not.toContain('PRIVATE NEW CITY');
  expect((await f.db.required('analysis_tasks','a')).snapshot[0].value).toBe('Old');
  await save({children:[{age:1,name:'A'}],city:'PRIVATE NEW CITY'});
  expect((await f.db.rows('notifications')).length).toBe(2);
  await expect(save({city:'stale'},old)).rejects.toThrow('CONFLICT');
  expect((await f.db.rows('notifications')).length).toBe(2);
  await save({city:'PRIVATE NEW CITY',children:[{name:'B',age:1}]});
  notes=await f.db.rows('notifications');expect(notes.filter(n=>n.profile_id==='pro')).toHaveLength(1);expect(notes.filter(n=>n.profile_id==='rep')).toHaveLength(2);
  await save({children:[{name:'B',age:1}]});expect((await f.db.rows('notifications')).filter(n=>n.profile_id==='pro')).toHaveLength(2);
 }finally{f.sqlite.close();}
});

test('draft edits do not create post-submission notices',async()=>{
 const f=fixture();try{
  const family=await f.db.required('families','f1');
  await dispatch(f.db,await f.actor('client'),await f.db.version(),'rpc_save_family',{p_family_id:'f1',p_expected_updated_at:family.updated_at,p_patch:{answers:{city:'Draft'}}});
  expect(await f.db.rows('notifications')).toHaveLength(0);
 }finally{f.sqlite.close();}
});
