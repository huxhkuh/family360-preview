import {z} from 'zod';
import {Database,ApiError,requireThat,uuid,now,type Row} from './db';
import {familyAccess,documentAccess,type Actor,type Env} from './auth';
import {workspace} from './workspace';
import {briefInput} from '../../src/ai/brief-context';
import {extractionSchema,fieldLabels,type AiSource,type AiJob,type BriefInput} from '../../src/ai/contracts';
import {readDocument,createBrief} from './ai-provider';

export const aiOperations=['rpc_ai_document','rpc_ai_read_document','rpc_ai_review_field','rpc_ai_brief','rpc_ai_prepare_brief'];
const parse=<T>(s:z.ZodType<T>,v:unknown)=>{const r=s.safeParse(v);if(!r.success)throw new ApiError('VALIDATION',400);return r.data;};
const id=z.string().min(1).max(150);
export const aiConfigured=(env:Env)=>env.AI_ENABLED==='true'&&!!env.OPENAI_API_KEY&&!!env.AI_JOBS;
const decode=(row:Row):Row=>({...row,input:JSON.parse(row.input),result:row.result?JSON.parse(row.result):null});
async function jobById(db:Database,id:string){const row=await db.statement('SELECT * FROM ai_jobs WHERE id=?',[id]).first<Row>();return row?decode(row):null;}
async function fingerprint(input:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(input)));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function reviews(db:Database,jobId:string){return (await db.statement('SELECT field_id,value,status,note,reviewed_by,reviewed_at FROM ai_field_reviews WHERE job_id=?',[jobId]).all()).results as AiJob['reviews'];}
async function publicJob(db:Database,j:Row|null,staff:boolean){if(!j)return null;return {id:j.id,kind:j.kind,status:j.status,revision:j.revision,result:staff?j.result:null,reviews:staff?await reviews(db,j.id):[],sources:staff?j.input.sources||[]:[],error_code:j.error_code,created_at:j.created_at,updated_at:j.updated_at,...(staff&&j.kind==='brief'?{input:j.input}:{})};}
async function staffAccess(db:Database,actor:Actor,familyId:unknown,permission='families.edit'){requireThat(['admin','representative'].includes(actor.profile.role));return familyAccess(db,actor,familyId,permission);}
async function budget(db:Database,env:Env){const limit=Math.min(1000,Math.max(1,Number(env.AI_DAILY_JOB_LIMIT)||50));const total=await db.statement("SELECT COUNT(*) AS n FROM ai_jobs WHERE created_at>=?",[new Date(Date.now()-86400000).toISOString()]).first<number>('n');requireThat((total||0)<limit,'AI_BUDGET_LIMIT',429);}
async function insertJob(db:Database,actor:Actor,kind:'document'|'brief',familyId:string,fp:string,input:unknown,env:Env,extra:{documentId?:string;versionId?:string}={}){
 const at=now(),limit=Math.min(1000,Math.max(1,Number(env.AI_DAILY_JOB_LIMIT)||50));await db.statement("INSERT INTO ai_jobs(id,kind,family_id,document_id,document_version_id,requested_by,requested_role,fingerprint,input,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,'queued',?,? WHERE (SELECT COUNT(*) FROM ai_jobs WHERE created_at>=?)<? ON CONFLICT(kind,family_id,fingerprint) DO NOTHING",[uuid(),kind,familyId,extra.documentId||null,extra.versionId||null,actor.profile.id,actor.profile.role,fp,JSON.stringify(input),at,at,new Date(Date.now()-86400000).toISOString(),limit]).run();
 const row=await db.statement('SELECT * FROM ai_jobs WHERE kind=? AND family_id=? AND fingerprint=?',[kind,familyId,fp]).first<Row>();requireThat(row,'AI_BUDGET_LIMIT',429);return decode(row);
}
export async function enqueueDocument(db:Database,actor:Actor,env:Env,documentId:string){
 requireThat(aiConfigured(env),'AI_NOT_CONFIGURED',503);const doc=await documentAccess(db,actor,documentId,true);requireThat(doc.type==='file'&&doc.storage_path,'AI_NO_FILE',400);
 const version=await db.statement('SELECT * FROM document_versions WHERE document_id=? AND object_key=?',[doc.id,doc.storage_path]).first<Row>();requireThat(version,'AI_NO_FILE',400);
 const fp=String(version.id);const old=await db.statement("SELECT * FROM ai_jobs WHERE kind='document' AND family_id=? AND fingerprint=?",[doc.family_id,fp]).first<Row>();
 if(old){const job=decode(old);requireThat(job.status!=='failed'||job.attempts<3,'AI_RETRY_LIMIT',429);if(job.status==='failed'&&job.attempts<3)await db.statement("UPDATE ai_jobs SET status='queued',error_code=NULL,next_attempt_at=NULL,updated_at=? WHERE id=? AND status='failed'",[now(),job.id]).run();return (await jobById(db,job.id))!;}
 await budget(db,env);return insertJob(db,actor,'document',doc.family_id,fp,{object_key:version.object_key,sha256:version.sha256,mime:version.mime_type},env,{documentId:doc.id,versionId:version.id});
}
export async function verifiedDocumentFacts(db:Database,familyId:string):Promise<AiSource[]>{
 const rows=(await db.statement("SELECT j.id,j.document_id,j.document_version_id,j.result,r.field_id,r.value FROM ai_jobs j JOIN documents d ON d.id=j.document_id JOIN document_versions v ON v.id=j.document_version_id JOIN ai_field_reviews r ON r.job_id=j.id WHERE j.family_id=? AND j.status IN ('review','ready') AND r.status='confirmed' AND d.status='approved' AND d.storage_path=v.object_key",[familyId]).all<Row>()).results;
 return rows.flatMap(row=>{const result=extractionSchema.parse(JSON.parse(row.result));const f=result.fields[Number(row.field_id.replace('field-',''))-1];return f?[{id:`d:${row.document_version_id}:${row.field_id}`,label:`${fieldLabels[f.key]}${f.owner?' · '+f.owner:''}${f.period?' · '+f.period:''}`,value:row.value+(f.unit==='ILS'?' ₪':f.unit==='percent'?'%':''),kind:'document' as const,document_id:row.document_id,page:f.page,quote:f.quote}]:[];});
}
async function preparation(db:Database,actor:Actor,familyId:unknown){const family=await staffAccess(db,actor,familyId);const w=await workspace(db,actor,family.id);const input=briefInput(w,family.id,await verifiedDocumentFacts(db,family.id));return {family,input,fp:await fingerprint({family:family.id,prompt:'brief-v1',input})};}
export async function aiOperation(db:Database,actor:Actor,env:Env,name:string,args:Row){
 const recordVersion=await db.version();const staff=['admin','representative'].includes(actor.profile.role),configured=aiConfigured(env);
 if(name==='rpc_ai_document'||name==='rpc_ai_read_document'){
  const documentId=parse(id,args.p_document_id);const doc=await documentAccess(db,actor,documentId);requireThat(actor.profile.role!=='professional');
  let job:Row|null=null;
  if(name==='rpc_ai_read_document'){await staffAccess(db,actor,doc.family_id,'documents.manage');job=await enqueueDocument(db,actor,env,doc.id);}
  else {const row=await db.statement("SELECT j.* FROM ai_jobs j JOIN document_versions v ON v.id=j.document_version_id WHERE j.document_id=? AND v.object_key=? ORDER BY j.created_at DESC LIMIT 1",[doc.id,doc.storage_path||'']).first<Row>();job=row?decode(row):null;}
  return {configured,job:await publicJob(db,job,staff)};
 }
 if(name==='rpc_ai_review_field'){
  const a=parse(z.object({p_job_id:id,p_field_id:z.string().regex(/^field-[1-9][0-9]?$/),p_value:z.string().trim().min(1).max(500),p_status:z.enum(['confirmed','rejected']),p_note:z.string().max(1000),p_checked:z.literal(true),p_expected_revision:z.number().int().positive()}),args);
  const job=await jobById(db,a.p_job_id);requireThat(job&&job.kind==='document');await staffAccess(db,actor,job.family_id,'documents.manage');requireThat(['review','ready'].includes(job.status),'AI_STALE',409);
  const doc=await db.required('documents',job.document_id),version=await db.required('document_versions',job.document_version_id);requireThat(doc.storage_path===version.object_key,'AI_STALE',409);
  const fields=extractionSchema.parse(job.result).fields,field=fields[Number(a.p_field_id.slice(6))-1];requireThat(field,'VALIDATION',400);requireThat(a.p_value===field.value||a.p_note.trim().length>=3,'VALIDATION',400);
  const at=now(),guard=uuid();await db.commit(recordVersion,actor.profile,'ai_review_field','document',doc.id,[
   db.statement('UPDATE ai_jobs SET revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status IN (\'review\',\'ready\')',[at,job.id,a.p_expected_revision]),
   db.statement('INSERT INTO transaction_assertions(id,valid) VALUES (?,CASE WHEN changes()=1 THEN 1 ELSE 0 END)',[guard]),
   db.statement('INSERT INTO ai_field_reviews(job_id,field_id,value,status,note,reviewed_by,reviewed_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(job_id,field_id) DO UPDATE SET value=excluded.value,status=excluded.status,note=excluded.note,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at',[job.id,a.p_field_id,a.p_value,a.p_status,a.p_note,actor.profile.id,at]),
   db.statement('DELETE FROM transaction_assertions WHERE id=?',[guard])
  ]).catch(()=>{throw new ApiError('CONFLICT',409);});
  return {configured,job:await publicJob(db,await jobById(db,job.id),true)};
 }
 if(name==='rpc_ai_brief'||name==='rpc_ai_prepare_brief'){
  const {family,input,fp}=await preparation(db,actor,parse(id,args.p_family_id));
  let row=await db.statement("SELECT * FROM ai_jobs WHERE kind='brief' AND family_id=? AND fingerprint=?",[family.id,fp]).first<Row>();let job=row?decode(row):null;
  if(name==='rpc_ai_prepare_brief'){
   requireThat(configured,'AI_NOT_CONFIGURED',503);
   if(!job){await budget(db,env);job=await insertJob(db,actor,'brief',family.id,fp,input,env);}
   else if(job.status==='failed'){requireThat(job.attempts<3,'AI_RETRY_LIMIT',429);await db.statement("UPDATE ai_jobs SET status='queued',error_code=NULL,next_attempt_at=NULL WHERE id=? AND status='failed'",[job.id]).run();job=await jobById(db,job.id);}
  }
  if(!job){row=await db.statement("SELECT * FROM ai_jobs WHERE kind='brief' AND family_id=? ORDER BY created_at DESC LIMIT 1",[family.id]).first<Row>();if(row)job={...decode(row),status:'stale'};}
  return {configured,job:await publicJob(db,job,true),coverage:input.coverage};
 }
 throw new ApiError('UNKNOWN_OPERATION',404);
}
async function actorForJob(db:Database,job:Row):Promise<Actor>{const profile=await db.required('profiles',job.requested_by);requireThat(profile.active&&profile.role===job.requested_role);const representative=profile.role==='representative'?(await db.rows('representatives','profile_id=? AND active=1',[profile.id]))[0]:undefined;requireThat(profile.role!=='representative'||representative);return {profile,permissions:profile.role==='admin'?['*']:representative?.permissions||[],representative,aal:'aal2',authId:profile.auth_user_id,email:'',issuedAt:Math.floor(Date.now()/1000)};}
export async function processAiJob(env:Env,jobId:string,fetcher:typeof fetch=fetch){
 const db=new Database(env.DB);let job=await jobById(db,jobId);if(!job||!aiConfigured(env)||['ready','review','stale'].includes(job.status)||job.attempts>=3)return;
 if(job.status==='failed')return;if(job.next_attempt_at&&job.next_attempt_at>now())return;
 const lease=uuid(),at=now();await db.statement("UPDATE ai_jobs SET status='processing',attempts=attempts+1,lease_token=?,lease_until=?,updated_at=? WHERE id=? AND attempts<3 AND (status='queued' OR (status='processing' AND lease_until<?))",[lease,new Date(Date.now()+120000).toISOString(),at,job.id,at]).run();
 job=await jobById(db,jobId);if(!job||job.lease_token!==lease)return;
 try{
  const actor=await actorForJob(db,job);let generated:{result:unknown;tokens:number};
  if(job.kind==='document'){
   const doc=await documentAccess(db,actor,job.document_id,true),version=await db.required('document_versions',job.document_version_id);requireThat(doc.storage_path===version.object_key,'AI_STALE',409);
   const object=await env.DOCUMENTS.get(version.object_key);requireThat(object,'AI_NO_FILE',400);const bytes=new Uint8Array(await object.arrayBuffer());requireThat(bytes.length<=20971520,'FILE_SIZE',413);
   generated=await readDocument(env,{bytes,mime:version.mime_type},fetcher);
   const current=await db.required('documents',job.document_id);requireThat(current.storage_path===version.object_key,'AI_STALE',409);
  }else {const current=await preparation(db,actor,job.family_id);requireThat(current.fp===job.fingerprint,'AI_STALE',409);generated=await createBrief(env,current.input,fetcher);const latest=await preparation(db,actor,job.family_id);requireThat(latest.fp===job.fingerprint,'AI_STALE',409);}
  await db.statement("UPDATE ai_jobs SET status=?,result=?,token_usage=?,error_code=NULL,lease_token=NULL,lease_until=NULL,revision=revision+1,updated_at=? WHERE id=? AND lease_token=?",[job.kind==='document'?'review':'ready',JSON.stringify(generated.result),generated.tokens,now(),job.id,lease]).run();
 }catch(e){const known=['AI_STALE','AI_NO_FILE','AI_OUTPUT_INVALID','AI_UNAVAILABLE','AI_RATE_LIMITED','PERMISSION_DENIED'];const code=e instanceof Error&&known.includes(e.message)?e.message:'AI_UNAVAILABLE';const transient=['AI_UNAVAILABLE','AI_RATE_LIMITED'].includes(code)&&job.attempts<3;await db.statement('UPDATE ai_jobs SET status=?,error_code=?,next_attempt_at=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=?',[code==='AI_STALE'?'stale':transient?'queued':'failed',code,transient?new Date(Date.now()+60000).toISOString():null,now(),job.id,lease]).run();}
}
export async function flushAiJobs(env:Env){if(!aiConfigured(env))return;const db=new Database(env.DB),at=now();await db.statement("UPDATE ai_jobs SET status='failed',error_code='AI_UNAVAILABLE',lease_token=NULL,lease_until=NULL,updated_at=? WHERE status='processing' AND lease_until<? AND attempts>=3",[at,at]).run();const rows=(await db.statement("SELECT id FROM ai_jobs WHERE attempts<3 AND ((status='queued' AND (next_attempt_at IS NULL OR next_attempt_at<=?)) OR (status='processing' AND lease_until<?)) ORDER BY created_at LIMIT 10",[at,at]).all<{id:string}>()).results;for(const row of rows)await env.AI_JOBS!.send({job_id:row.id});}
