import {Context} from './context';
import {uuid,now,type Row} from './db';
import {reportOperation} from '../../src/reports/report-operations';
import {workspace} from './workspace';
export const reportOperations=['rpc_save_final_report','rpc_approve_final_report','rpc_reopen_final_report'];
export async function reports(c:Context,name:string,a:Row){
 const meeting=await c.db.required('meetings',a.p_meeting_id);await c.staffFamily(meeting.family_id,'analysis.approve');
 const w=await workspace(c.db,c.actor,meeting.family_id);const state={...w,finalReportHistory:[]};const old=(await c.db.rows('final_reports','meeting_id=?',[meeting.id]))[0];
 const result=reportOperation(name,a,state as any,c.actor.profile.role) as Row;
 if(result.snapshot)result.snapshot.approved_by=c.actor.profile.name;
 const {id,meeting_id,family_id,revision,status,snapshot,updated_at,...content}=result;
 const row={id,meeting_id,family_id,revision,status,snapshot,updated_at,content};
 if(old)c.patch('final_reports',old,{revision,status,snapshot,updated_at,content});else c.insert('final_reports',row);
 if(name==='rpc_approve_final_report'){c.insert('final_report_history',{id:uuid(),report_id:id,revision,snapshot});const family=await c.db.required('families',family_id);c.patch('families',family,{status:'completed'});c.notify(family.client_profile_id,family_id,'הדוח הסופי זמין באזור האישי');const referrals=await c.db.rows('referrals','family_id=?',[family_id]);for(const referral of referrals)c.patch('referrals',referral,{status:'completed'});}
 c.event(family_id,name==='rpc_approve_final_report'?'הדוח הסופי אושר':name==='rpc_reopen_final_report'?'הדוח הוחזר לתיקון':'טיוטת הדוח נשמרה');return {...content,id,meeting_id,family_id,revision,status,snapshot,updated_at:now()};
}
