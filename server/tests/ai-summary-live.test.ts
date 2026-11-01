import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fixture} from './fixture';
import {aiOperation,processAiJob} from '../src/ai-workflow';
import type {Env} from '../src/auth';

it.skipIf(process.env.RUN_LIVE_AI!=='1')('drafts client wording after the call using synthetic notes and the existing key',async()=>{
 const {existingAiKey}=await import('../../scripts/ai-key.mjs'),f=fixture();f.insert('meetings',{id:'synthetic-summary',family_id:'f1',status:'completed'});
 const env={DB:f.binding,AI_ENABLED:'true',OPENAI_API_KEY:existingAiKey(),AI_MODEL:'gpt-6.1-sol',AI_JOBS:{send:async()=>{}}} as unknown as Env,rep=await f.actor('rep');
 const args={p_meeting_id:'synthetic-summary',p_topic_key:'bank_fees',p_action:'summarize',p_client_wording:true,p_notes:'נתוני בדיקה סינתטיים בלבד. נבדוק אפשרות להפחתת עמלות של 70 ש״ח בחודש, 840 ש״ח בשנה. האפשרות טרם מומשה ולא התקבלה החלטה אם להתקדם. פנימי לצוות: לתאם מול רונית מחר.'};
 const state=await aiOperation(f.db,rep,env,'rpc_ai_assist_topic',args);await processAiJob(env,state.job.id);
 const ready=await aiOperation(f.db,rep,env,'rpc_ai_topic_assistance',{...args,p_job_id:state.job.id});expect(ready.job.status,ready.job.error_code||'provider result').toBe('ready');expect(ready.job.result.text).toContain('70');expect(ready.job.result.text).toContain('840');expect(ready.job.result.text).not.toMatch(/רונית|פנימי/);expect(await f.db.rows('meeting_summaries')).toHaveLength(0);expect(await f.db.rows('guided_decisions')).toHaveLength(0);
 mkdirSync('artifacts/ai-summary-live',{recursive:true});writeFileSync('artifacts/ai-summary-live/results.json',JSON.stringify({passed:true,syntheticOnly:true,model:env.AI_MODEL,suggestion:ready.job.result},null,2));
},120000);
