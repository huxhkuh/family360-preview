import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fixture} from './fixture';
import {aiOperation,processAiJob} from '../src/ai-workflow';
import {topicActions,type TopicAction} from '../../src/ai/topic-contracts';
import type {Env} from '../src/auth';

it.skipIf(process.env.RUN_LIVE_AI!=='1')('checks all four topic actions with the same existing provider and synthetic data',async()=>{
 const {existingAiKey}=await import('../../scripts/ai-key.mjs');const f=fixture();
 f.insert('meetings',{id:'synthetic-call',family_id:'f1',status:'in_progress'});
 f.sqlite.exec(`UPDATE families SET answers='{"monthly_fees":"35","bank_count":"1","bank_fee_plan":"לא ידוע"}' WHERE id='f1'`);
 const env={DB:f.binding,AI_ENABLED:'true',OPENAI_API_KEY:existingAiKey(),AI_MODEL:'gpt-6.1-sol',AI_JOBS:{send:async()=>{}}} as unknown as Env;
 const rep=await f.actor('rep'),results=[];
 for(const action of Object.keys(topicActions) as TopicAction[]){
  const args={p_meeting_id:'synthetic-call',p_topic_key:'bank_fees',p_action:action,p_notes:'משפחה סינתטית בלבד. נמסר שמשלמים עמלות. ביקשו להבין אילו מסלולים קיימים, אך טרם החליטו אם להתקדם. צריך לברר אילו פעולות מבוצעות בחודש.'};
  const state=await aiOperation(f.db,rep,env,'rpc_ai_assist_topic',args);await processAiJob(env,state.job.id,async(...args)=>{try{const r=await fetch(...args);if(!r.ok){const e=await r.clone().json() as any;console.log(JSON.stringify({httpStatus:r.status,providerCode:e.error?.code||null}));}return r;}catch(e:any){console.log(JSON.stringify({networkCode:e.cause?.code||e.name}));throw e;}});
  const ready=await aiOperation(f.db,rep,env,'rpc_ai_topic_assistance',{...args,p_job_id:state.job.id});expect(ready.job.status,ready.job.error_code||'provider result').toBe('ready');expect(ready.job.result.text.length).toBeGreaterThan(15);expect(ready.job.result.sources.length).toBeGreaterThan(0);
  results.push({action,text:ready.job.result.text,sources:ready.job.result.sources,caution:ready.job.result.caution});
 }
 expect(await f.db.rows('guided_decisions')).toHaveLength(0);expect(await f.db.rows('analysis_tasks')).toHaveLength(0);
 mkdirSync('artifacts/ai-topic-live',{recursive:true});writeFileSync('artifacts/ai-topic-live/results.json',JSON.stringify({passed:true,syntheticOnly:true,model:env.AI_MODEL,actions:results},null,2));
},240000);
