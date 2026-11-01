import {it,expect} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fixture} from './fixture';
import {enqueueDocument,processAiJob,aiOperation} from '../src/ai-workflow';
import type {Env} from '../src/auth';

it.skipIf(process.env.RUN_LIVE_AI!=='1')('runs extraction, human review and all conversation topics with the existing provider',async()=>{
 // Explicit opt-in. The input is the synthetic PDF produced by check-ai-live.mjs.
 const {existingAiKey}=await import('../../scripts/ai-key.mjs');
 const f=fixture(),bytes=readFileSync('artifacts/ai-live/synthetic-payslip.pdf');
 const env={DB:f.binding,AI_ENABLED:'true',OPENAI_API_KEY:existingAiKey(),AI_MODEL:process.env.AI_MODEL||'gpt-6.1-sol',AI_JOBS:{send:async()=>{}},DOCUMENTS:{get:async()=>({arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)})}} as unknown as Env;
 f.insert('document_versions',{id:'live-version',document_id:'d1',object_key:'f1/d1/live-version',file_name:'synthetic.pdf',mime_type:'application/pdf',size:bytes.length,sha256:'synthetic',uploaded_by:'client',created_at:new Date().toISOString()});
 f.sqlite.exec(`UPDATE documents SET storage_path='f1/d1/live-version',status='pending' WHERE id='d1';UPDATE families SET answers='{"housing":"rent","city":"ירושלים","marital":"single","h_emp":["emp"],"h_gross":"12000"}' WHERE id='f1'`);
 const rep=await f.actor('rep'),job=await enqueueDocument(f.db,rep,env,'d1');await processAiJob(env,job.id);
 const read=await aiOperation(f.db,rep,env,'rpc_ai_document',{p_document_id:'d1'});expect(read.job.status,read.job.error_code||'provider response').toBe('review');
 const index=read.job.result.fields.findIndex((field:any)=>field.key==='gross_salary');expect(index).toBeGreaterThanOrEqual(0);
 await aiOperation(f.db,rep,env,'rpc_ai_review_field',{p_job_id:job.id,p_field_id:'field-'+(index+1),p_value:read.job.result.fields[index].value,p_status:'confirmed',p_note:'',p_checked:true,p_expected_revision:read.job.revision});
 f.sqlite.exec("UPDATE documents SET status='approved' WHERE id='d1'");
 const prepare=await aiOperation(f.db,rep,env,'rpc_ai_prepare_brief',{p_family_id:'f1'});await processAiJob(env,prepare.job.id);
 const ready=await aiOperation(f.db,rep,env,'rpc_ai_brief',{p_family_id:'f1'});expect(ready.job.status,ready.job.error_code||'provider response').toBe('ready');expect(ready.job.result.topics).toHaveLength(ready.job.input.topics.length);expect(ready.job.sources.some((s:any)=>s.kind==='document')).toBe(true);
 mkdirSync('artifacts/ai-live',{recursive:true});writeFileSync('artifacts/ai-live/full-workflow.json',JSON.stringify({passed:true,syntheticOnly:true,model:env.AI_MODEL,topicCount:ready.job.result.topics.length,sourceCount:ready.job.sources.length,coverageChapters:ready.job.input.coverage.length},null,2));
},240000);
