import {z} from 'zod';
import {Context,parse,idSchema,stateIn} from './context';
import {documentAccess,type Env} from './auth';
import {requireThat,uuid,now,type Row} from './db';
import {clearinghouseConsent} from '../../src/families/clearinghouse-consent';
import {documentPreparation} from '../../src/companion/document-preparation';
export const documentOperations=['rpc_request_document','rpc_review_document','rpc_share_document','rpc_sign_document','rpc_prepare_document'];
export async function documents(c:Context,name:string,a:Row):Promise<unknown>{
 if(name==='rpc_request_document'){
  const f=await c.staffFamily(a.p_family_id,'documents.manage');const dt=await c.db.required('document_types',a.p_type_id);requireThat(dt.active,'VALIDATION',400);const old=(await c.db.rows('documents','family_id=? AND key=?',[f.id,dt.key]))[0];if(old)return old;
  const fields:Row={};for(const key of ['purpose','subject','period','source_hint'])fields[key]=parse(z.string().max(500),a['p_'+key]||'');return c.insert('documents',{id:uuid(),family_id:f.id,document_type_id:dt.id,key:dt.key,name:dt.name,type:dt.type,...fields});
 }
 if(name==='rpc_prepare_document'){
  const {familyAccess}=await import('./auth');const f=await familyAccess(c.db,c.actor,a.p_family_id,c.actor.profile.role==='client'?undefined:'documents.manage');const preparation=documentPreparation(f.answers).find(p=>p.key===a.p_key);requireThat(preparation,'VALIDATION',400);const old=(await c.db.rows('documents','family_id=? AND key=?',[f.id,preparation.key]))[0];if(old)return old;
  return c.insert('documents',{id:uuid(),family_id:f.id,key:preparation.key,name:preparation.name,type:preparation.type||'file',optional:true,purpose:preparation.reason||'',source_hint:preparation.source||'',period:preparation.period||'',status:'missing'});
 }
 const doc=await documentAccess(c.db,c.actor,a.p_document_id,name!=='rpc_share_document');
 if(name==='rpc_review_document'){await c.staffFamily(doc.family_id,'documents.manage');stateIn(doc,['pending']);const approved=parse(z.boolean(),a.p_approved);const reason=approved?null:parse(z.string().trim().min(3).max(3000),a.p_reason);const f=await c.db.required('families',doc.family_id);c.notify(f.client_profile_id,f.id,approved?'מסמך אושר':'נדרש תיקון במסמך');return c.patch('documents',doc,{status:approved?'approved':'rejected',reject_reason:reason,approved_at:approved?now():null});}
 if(name==='rpc_share_document'){
  await c.staffFamily(doc.family_id,'documents.manage');const kind=parse(z.enum(['analysis','execution']),a.p_kind);const task=await c.db.required(kind+'_tasks',a.p_task_id);requireThat(task.family_id===doc.family_id);const revoked=a.p_revoke===true;if(!revoked)stateIn(doc,['approved','signed']);const old=(await c.db.rows('task_documents',`document_id=? AND ${kind}_task_id=?`,[doc.id,task.id]))[0];if(old)return c.patch('task_documents',old,{revoked_at:revoked?now():null,shared_at:now(),shared_by:c.actor.profile.id});if(revoked)return null;return c.insert('task_documents',{id:uuid(),document_id:doc.id,[kind+'_task_id']:task.id,shared_by:c.actor.profile.id});
 }
 if(name==='rpc_sign_document'){
  requireThat(c.actor.profile.role==='client');requireThat(doc.type==='signature'&&a.p_consent===true,'VALIDATION',400);stateIn(doc,['missing','rejected']);const signer=parse(z.string().trim().min(2).max(150),a.p_signer);
  let consent:Row;if(/^clearinghouse_auth_[hw]$/.test(doc.key)){requireThat(a.p_version===clearinghouseConsent.version&&a.p_text===clearinghouseConsent.text,'VALIDATION',400);consent={...clearinghouseConsent};}else{const dt=await c.db.required('document_types',doc.document_type_id);requireThat(dt.active&&dt.description?.length>=20&&dt.description===a.p_text,'VALIDATION',400);consent={text:dt.description,version:dt.updated_at,recipient:'מסודרים 360',scope:doc.name};}
  return c.patch('documents',doc,{status:'signed',consent:{...consent,signer,signed_at:now()},uploaded_at:now()});
 }
}
export async function boundedBody(request:Request,limit:number){const declared=Number(request.headers.get('content-length'));requireThat(!declared||declared<=limit,'FILE_SIZE',413);const reader=request.body?.getReader();requireThat(reader,'VALIDATION',400);const chunks:Uint8Array[]=[];let size=0;while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>limit){await reader.cancel();throw new Error('FILE_SIZE');}chunks.push(r.value);}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}return bytes;}
export function validateFile(bytes:Uint8Array,mime:string,fileName:string){requireThat(bytes.length>0&&bytes.length<=20971520,'FILE_SIZE',413);const types:Record<string,RegExp>={'application/pdf':/\.pdf$/i,'image/png':/\.png$/i,'image/jpeg':/\.jpe?g$/i,'image/webp':/\.webp$/i};requireThat(fileName.length<=200&&!/[\x00-\x1f/\\]/.test(fileName)&&types[mime]?.test(fileName),'FILE_TYPE',400);const head=new TextDecoder().decode(bytes.slice(0,12));const valid=mime==='application/pdf'?head.startsWith('%PDF-'):mime==='image/png'?[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:head.startsWith('RIFF')&&head.slice(8,12)==='WEBP';requireThat(valid,'FILE_TYPE',400);}
export async function upload(c:Context,env:Env,request:Request,documentId:string){
 const doc=await documentAccess(c.db,c.actor,documentId,true);requireThat(doc.type==='file','VALIDATION',400);if(c.actor.profile.role==='client')stateIn(doc,['missing','rejected']);
 const fileName=decodeURIComponent(request.headers.get('x-file-name')||'');const mime=request.headers.get('content-type')?.split(';')[0]||'';const bytes=await boundedBody(request,20971520);validateFile(bytes,mime,fileName);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');const key=doc.family_id+'/'+doc.id+'/'+uuid();
 // Never overwrite an existing object. Failed DB commits leave an unreferenced private version.
 await env.DOCUMENTS.put(key,bytes,{httpMetadata:{contentType:mime,cacheControl:'private, no-store'}});
 c.insert('document_versions',{id:uuid(),document_id:doc.id,object_key:key,file_name:fileName,mime_type:mime,size:bytes.length,sha256:hash,uploaded_by:c.actor.profile.id,created_at:now()});
 c.patch('documents',doc,{storage_path:key,file_name:fileName,file_size:bytes.length,mime_type:mime,status:'pending',uploaded_at:now(),reject_reason:null,approved_at:null});
 await c.db.commit(c.version,c.actor.profile,'upload','document',doc.id,c.statements);return {id:doc.id};
}
export async function download(c:Context,env:Env,documentId:string){const doc=await documentAccess(c.db,c.actor,documentId);requireThat(doc.storage_path,'NOT_FOUND',404);const object=await env.DOCUMENTS.get(doc.storage_path);requireThat(object,'NOT_FOUND',404);await c.db.commit(c.version,c.actor.profile,'download','document',doc.id,[]);return new Response(object.body as any,{headers:{'Content-Type':doc.mime_type||'application/octet-stream','Content-Disposition':`attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(doc.file_name||'document')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
