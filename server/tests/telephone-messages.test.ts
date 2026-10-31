import {describe,it,expect} from 'vitest';
import {fixture} from './fixture';
import {storeVoiceMessage,listVoiceMessages,listenVoiceMessage,handleVoiceMessage,validateVoiceMessage} from '../src/telephone-messages';
import type {Env} from '../src/auth';
function wav(seconds=1){
 const n=8000*seconds,b=new Uint8Array(44+n),v=new DataView(b.buffer),s=(p:number,x:string)=>[...x].forEach((c,i)=>b[p+i]=c.charCodeAt(0));
 s(0,'RIFF');v.setUint32(4,b.length-8,true);s(8,'WAVE');s(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);s(36,'data');v.setUint32(40,n,true);return b;
}
function environment(){const objects=new Map<string,Uint8Array>();const bucket={put:async(k:string,v:Uint8Array)=>{objects.set(k,v);},delete:async(k:string)=>{objects.delete(k);},get:async(k:string)=>{const v=objects.get(k);return v?{body:v}:null;}};return {env:{DOCUMENTS:bucket} as unknown as Env,objects};}
describe('telephone voice messages',()=>{
 it('rejects invalid and excessive recordings',()=>{expect(validateVoiceMessage(wav())).toBe(1);expect(()=>validateVoiceMessage(new Uint8Array(50))).toThrow();expect(()=>validateVoiceMessage(wav(121))).toThrow();const bad=wav();new DataView(bad.buffer).setUint32(28,1,true);expect(()=>validateVoiceMessage(bad)).toThrow();});
 it('does not store or notify without an active assigned representative',async()=>{
  const {db,sqlite}=fixture(),{env,objects}=environment();
  for(const sql of ["UPDATE families SET representative_id=NULL WHERE id='f1'","UPDATE families SET representative_id='r1' WHERE id='f1'; UPDATE representatives SET active=0 WHERE id='r1'","UPDATE representatives SET active=1 WHERE id='r1'; UPDATE profiles SET active=0 WHERE id='rep'"]) {
   sqlite.exec(sql); await expect(storeVoiceMessage(db,env,'f1','provider:no-rep',wav())).rejects.toThrow('NO_ACTIVE_REPRESENTATIVE');
   expect(objects.size).toBe(0);expect((await db.statement('SELECT id FROM telephone_messages').all()).results).toHaveLength(0);expect(await db.rows('notifications','family_id=?',['f1'])).toHaveLength(0);
  }
 });
 it('deduplicates messages and limits access to assigned staff',async()=>{
  const {db,actor}=fixture(), {env,objects}=environment();const first=await storeVoiceMessage(db,env,'f1','provider:call-1',wav());
  expect(await storeVoiceMessage(db,env,'f1','provider:call-1',wav())).toEqual(first);expect(objects.size).toBe(1);expect((await db.rows('notifications','family_id=?',['f1'])).length).toBe(1);
  await expect(storeVoiceMessage(db,env,'f2','provider:call-1',wav())).rejects.toThrow();
  expect(await listVoiceMessages(db,await actor('rep'),'f1')).toMatchObject([{id:first.id,status:'open'}]);
  for(const id of ['otherrep','client','pro']){await expect(listVoiceMessages(db,await actor(id),'f1')).rejects.toThrow();await expect(listenVoiceMessage(db,await actor(id),env,first.id)).rejects.toThrow();await expect(handleVoiceMessage(db,await actor(id),first.id)).rejects.toThrow();}
  const response=await listenVoiceMessage(db,await actor('rep'),env,first.id);expect(response.headers.get('cache-control')).toBe('private, no-store');
  await handleVoiceMessage(db,await actor('rep'),first.id);expect(await listVoiceMessages(db,await actor('rep'),'f1')).toMatchObject([{status:'handled'}]);
 });
});
