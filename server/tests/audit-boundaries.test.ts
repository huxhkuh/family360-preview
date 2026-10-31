import {test,expect} from 'vitest';
import {fixture} from './fixture';
import {boundedBody,upload} from '../src/documents';
import {Context} from '../src/context';
import {dispatch} from '../src/index';

test('streaming an oversized body returns the same 413 as Content-Length',async()=>{
 const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(5));c.close();}});
 const request=new Request('https://example.invalid',{method:'POST',body,duplex:'half'} as RequestInit);
 await expect(boundedBody(request,4)).rejects.toMatchObject({message:'FILE_SIZE',status:413});
 await expect(boundedBody(new Request('https://example.invalid',{method:'POST',headers:{'content-length':'5'},body:'12345'}),4)).rejects.toMatchObject({message:'FILE_SIZE',status:413});
 expect(await boundedBody(new Request('https://example.invalid',{method:'POST',body:'1234'}),4)).toHaveLength(4);
});

test('malformed filename encoding is rejected before writing storage',async()=>{
 const f=fixture();let writes=0;
 try{
  const c=new Context(f.db,await f.actor('client'),await f.db.version());
  const env={DOCUMENTS:{put:async()=>{writes++;}}} as any;
  const request=new Request('https://example.invalid',{method:'PUT',headers:{'content-type':'application/pdf','x-file-name':'bad%ZZ.pdf'},body:'%PDF-1.7 synthetic'});
  await expect(upload(c,env,request,'d1')).rejects.toMatchObject({message:'FILE_TYPE',status:400});
  expect(writes).toBe(0);expect((await f.db.required('documents','d1')).status).toBe('missing');
 }finally{f.sqlite.close();}
});

test.each([false,true])('cannot schedule a summary without current approved findings (stale=%s)',async stale=>{
 const f=fixture();try{
  if(stale)f.insert('analysis_tasks',{id:'old-analysis',task_number:'OLD',family_id:'f1',family_service_id:'fs1',service_id:'s1',professional_id:'p1',status:'approved'});
  await expect(dispatch(f.db,await f.actor('rep'),await f.db.version(),'rpc_schedule_meeting',{p_family_id:'f1',p_type:'phone',p_scheduled_at:'2030-01-01T10:00:00Z'})).rejects.toThrow('INVALID_STATE');
  expect(await f.db.rows('meetings')).toHaveLength(0);expect((await f.db.required('families','f1')).status).toBe('new');
 }finally{f.sqlite.close();}
});

test.each(['cancelled','reassigned'])('cannot create a misleading grant for a %s execution task',async status=>{
 const f=fixture();try{
  f.sqlite.exec("UPDATE documents SET status='approved' WHERE id='d1'");
  f.insert('execution_tasks',{id:'e1',task_number:'EX-1',family_id:'f1',family_service_id:'fs1',service_id:'s1',professional_id:'p1',status});
  await expect(dispatch(f.db,await f.actor('rep'),await f.db.version(),'rpc_share_document',{p_document_id:'d1',p_task_id:'e1',p_kind:'execution'})).rejects.toThrow('INVALID_STATE');
  expect(await f.db.rows('task_documents')).toHaveLength(0);
 }finally{f.sqlite.close();}
});
