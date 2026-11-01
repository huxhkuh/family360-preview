import {Context,parse,expected} from './context';
import {requireThat,now,uuid,type Row} from './db';
import {familyAccess} from './auth';
import {workspace} from './workspace';
import {conversationSummarySource,newSummaryContent,validateSummaryContent,summarySnapshot,summaryContentSchema,summarySnapshotSchema,type SummaryRecord} from '../../src/reports/conversation-summary';

export const summaryOperations=['rpc_meeting_summary','rpc_family_summaries','rpc_build_meeting_summary','rpc_save_meeting_summary','rpc_share_meeting_summary'];
export async function conversationSummaries(c:Context,name:string,a:Row){
 const staff=['admin','representative'].includes(c.actor.profile.role);
 if(name==='rpc_family_summaries'){
  requireThat(staff||c.actor.profile.role==='client');const family=await familyAccess(c.db,c.actor,a.p_family_id);
  const rows=await c.db.rows('meeting_summaries','family_id=? AND snapshot IS NOT NULL',[family.id],'ORDER BY updated_at DESC');
  return rows.map(r=>summarySnapshotSchema.parse(r.snapshot));
 }
 requireThat(staff);const meeting=await c.db.required('meetings',a.p_meeting_id);await c.staffFamily(meeting.family_id,name==='rpc_share_meeting_summary'?'analysis.approve':'families.edit');
 const old=(await c.db.rows('meeting_summaries','meeting_id=?',[meeting.id]))[0] as SummaryRecord|undefined;
 if(name==='rpc_meeting_summary')return old||null;
 requireThat(meeting.status!=='cancelled','INVALID_STATE',409);expected(old?.revision||0,a.p_expected_revision);
 const w=await workspace(c.db,c.actor,meeting.family_id),source=conversationSummarySource(w,meeting.id),at=now();let next:SummaryRecord;
 if(name==='rpc_build_meeting_summary')next={id:old?.id||uuid(),meeting_id:meeting.id,family_id:meeting.family_id,revision:(old?.revision||0)+1,status:'draft',source,content:newSummaryContent(source,old),snapshot:old?.snapshot||null,created_at:old?.created_at||at,updated_at:at};
 else {
  requireThat(old,'SUMMARY_INCOMPLETE',400);requireThat(old.status==='draft','INVALID_STATE',409);
  requireThat(JSON.stringify(source)===JSON.stringify(old.source),'SUMMARY_SOURCE_CHANGED',409);
  next={...old,revision:old.revision+1,updated_at:at};
  if(name==='rpc_save_meeting_summary')next.content=validateSummaryContent(parse(summaryContentSchema,a.p_content),source);
  else {
   requireThat(name==='rpc_share_meeting_summary','UNKNOWN_OPERATION',404);requireThat(meeting.status==='completed','SUMMARY_MEETING_OPEN',409);requireThat(a.p_reviewed===true,'SUMMARY_REVIEW_REQUIRED',400);
   validateSummaryContent(old.content,source,true);next.status='shared';next.snapshot=summarySnapshot(next,c.actor.profile.name,at,next.revision);
   c.insert('meeting_summary_history',{id:uuid(),summary_id:next.id,revision:next.revision,snapshot:next.snapshot});
   const family=await c.db.required('families',meeting.family_id);c.notify(family.client_profile_id,family.id,'סיכום השיחה זמין באזור האישי');
  }
 }
 if(old)c.patch('meeting_summaries',old,{revision:next.revision,status:next.status,source:next.source,content:next.content,snapshot:next.snapshot,updated_at:at});else c.insert('meeting_summaries',next);
 c.event(meeting.family_id,name==='rpc_share_meeting_summary'?'סיכום השיחה אושר להצגה למשפחה':'טיוטת סיכום השיחה נשמרה');return next;
}
