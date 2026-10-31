import {test,expect} from 'vitest';
import {fixture} from './fixture';
import {createTelephoneBinding,revokeTelephoneBinding} from '../src/telephone-auth';
import {createTelephoneFlow} from '../src/telephone-flow';
import type {Env} from '../src/auth';

const secret='test-secret-with-at-least-32-bytes';
function wav(){const n=8000,b=new Uint8Array(44+n),v=new DataView(b.buffer),s=(p:number,x:string)=>[...x].forEach((c,i)=>b[p+i]=c.charCodeAt(0));s(0,'RIFF');v.setUint32(4,b.length-8,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);s(36,'data');v.setUint32(40,n,true);return b;}
function env(){const objects=new Map<string,Uint8Array>();const bucket={put:async(k:string,v:Uint8Array)=>{objects.set(k,v);},delete:async(k:string)=>{objects.delete(k);}};return {objects,env:{DOCUMENTS:bucket} as unknown as Env};}

test('call flow reuses a received OTP after reconnect and only reads authorized client information',async()=>{
 const f=fixture(),e=env();try{
  await createTelephoneBinding(f.binding,'f1','client','0501234567','rep');
  f.insert('family_tasks',{id:'v1',family_id:'f1',title:'משימה ללקוח',owner_role:'client',visible_to_client:1,due_on:'2026-11-01',created_by:'rep',updated_by:'rep'});
  f.insert('family_tasks',{id:'v2',family_id:'f1',title:'משימה פנימית',owner_role:'representative',visible_to_client:0,due_on:'2026-11-01',created_by:'rep',updated_by:'rep'});
  let code='',sent=0;const flow=createTelephoneFlow(f.db,e.env,secret,async(_phone,value)=>{code=value;sent++;});
  let result=await flow(null,{type:'start'});
  result=await flow(result.state,{type:'digits',value:'1'});
  result=await flow(result.state,{type:'digits',value:'0501234567'});expect(result.state.step).toBe('code');expect(sent).toBe(1);
  // The client receives the call and calls back after the cooldown. The existing code remains valid.
  f.sqlite.prepare('UPDATE telephone_challenges SET issued_at=0').run();
  result=await flow(null,{type:'start'});result=await flow(result.state,{type:'digits',value:'2'});result=await flow(result.state,{type:'digits',value:'0501234567'});expect(sent).toBe(1);
  result=await flow(result.state,{type:'digits',value:code});expect(result.state.step).toBe('menu');
  result=await flow(result.state,{type:'digits',value:'2'});expect(result.prompt).toContain('משימה ללקוח');expect(result.prompt).not.toContain('משימה פנימית');
  for(const digit of ['1','3','4','5']){result=await flow(result.state,{type:'digits',value:digit});expect(result.state.step).toBe('menu');}
  result=await flow(result.state,{type:'digits',value:'6'});expect(result.action).toBe('record');
  result=await flow(result.state,{type:'recording',sourceEvent:'test:1',bytes:wav()});expect(result.prompt).toContain('ההודעה נשמרה');expect(e.objects.size).toBe(1);
  expect((await f.db.statement('SELECT family_id,status FROM telephone_messages').first())).toMatchObject({family_id:'f1',status:'open'});
  f.sqlite.prepare('UPDATE representatives SET active=0 WHERE id=?').run('r1');
  result=await flow(result.state,{type:'digits',value:'6'});
  result=await flow(result.state,{type:'recording',sourceEvent:'test:2',bytes:wav()});
  expect(result.state.step).toBe('menu');expect(result.prompt).toContain('לא ניתן להשאיר הודעה כרגע');expect(result.prompt).not.toContain('ההודעה נשמרה');expect(e.objects.size).toBe(1);
 }finally{f.sqlite.close();}
});

test('invalid code, revoked session, bad numbers and wrong states do not disclose case information',async()=>{
 const f=fixture(),e=env();try{
  const id=await createTelephoneBinding(f.binding,'f1','client','0501234567','rep');let code='';
  const flow=createTelephoneFlow(f.db,e.env,secret,async(_phone,value)=>{code=value;});
  let result=await flow(null,{type:'start'});result=await flow(result.state,{type:'digits',value:'1'});result=await flow(result.state,{type:'digits',value:'123'});expect(result.state.step).toBe('phone');
  result=await flow(result.state,{type:'digits',value:'0501234567'});result=await flow(result.state,{type:'digits',value:code==='000000'?'000001':'000000'});expect(result.state.step).toBe('code');
  result=await flow(result.state,{type:'digits',value:code});const active=result.state;
  result=await flow(active,{type:'recording',sourceEvent:'test:1',bytes:wav()});expect(e.objects.size).toBe(0);
  await revokeTelephoneBinding(f.binding,id);result=await flow(active,{type:'digits',value:'1'});expect(result.state.step).toBe('start');expect(result.prompt).not.toContain('מצב הטיפול בתיק');
 }finally{f.sqlite.close();}
});
