import type {Workspace} from '../lib/model';
import {conversationSummarySource,newSummaryContent,validateSummaryContent,summarySnapshot,type SummaryRecord} from './conversation-summary';
const records=new Map<string,SummaryRecord>();
export const resetDemoSummaries=()=>records.clear();
export function demoSummary(name:string,a:Record<string,any>,w:Workspace){
 if(name==='rpc_family_summaries'){if(!['client','representative','admin'].includes(w.profile.role)||!w.families.some(f=>f.id===a.p_family_id))throw Error('PERMISSION_DENIED');return [...records.values()].filter(r=>r.family_id===a.p_family_id&&r.snapshot).map(r=>structuredClone(r.snapshot));}
 if(!['representative','admin'].includes(w.profile.role))throw Error('PERMISSION_DENIED');
 const meeting=w.meetings.find(m=>m.id===a.p_meeting_id);if(!meeting)throw Error('PERMISSION_DENIED');const old=records.get(meeting.id);
 if(name==='rpc_meeting_summary')return old?structuredClone(old):null;
 if((old?.revision||0)!==a.p_expected_revision)throw Error('CONFLICT');if(meeting.status==='cancelled')throw Error('INVALID_STATE');
 const source=conversationSummarySource(w,meeting.id),at=new Date().toISOString();let next:SummaryRecord;
 if(name==='rpc_build_meeting_summary')next={id:old?.id||'summary:'+meeting.id,meeting_id:meeting.id,family_id:meeting.family_id,revision:(old?.revision||0)+1,status:'draft',source,content:newSummaryContent(source,old),snapshot:old?.snapshot||null,created_at:old?.created_at||at,updated_at:at};
 else {if(!old)throw Error('SUMMARY_INCOMPLETE');if(old.status!=='draft')throw Error('INVALID_STATE');if(JSON.stringify(source)!==JSON.stringify(old.source))throw Error('SUMMARY_SOURCE_CHANGED');next=structuredClone({...old,revision:old.revision+1,updated_at:at});
  if(name==='rpc_save_meeting_summary')next.content=validateSummaryContent(a.p_content,source);
  else {if(meeting.status!=='completed')throw Error('SUMMARY_MEETING_OPEN');if(a.p_reviewed!==true)throw Error('SUMMARY_REVIEW_REQUIRED');validateSummaryContent(old.content,source,true);next.status='shared';next.snapshot=summarySnapshot(next,w.profile.name,at,next.revision);}
 }
 records.set(meeting.id,next);return structuredClone(next);
}
export const summaryRpcNames=['rpc_meeting_summary','rpc_family_summaries','rpc_build_meeting_summary','rpc_save_meeting_summary','rpc_share_meeting_summary'];
