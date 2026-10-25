import {beforeEach,describe,it,expect} from 'vitest';
import {reportOperation} from './report-operations';
import {parseReportMoney,reportReadiness,type FinalReport,type ReportContent,type ReportSnapshot} from './report-data';
import {loadWorkspace,resetDemo,rpc,selectRole} from '../lib/backend';
const content:ReportContent={context:'המשפחה ביקשה להפחית עלויות קבועות',outcome:'בוצע שינוי מסלול עמלות ונבדק החיוב המעודכן.',recommendations:'לבדוק את החיוב הבא ולשמור את אישור הבנק.',no_savings_reason:'',facts:[{id:'bank',description:'עמלות הבנק',source:'אישור מהבנק',confirmed:true,result:'realized',kind:'recurring',period:'month',before_agorot:15000,after_agorot:5000}]};
const fixture=()=>({families:[{id:'f1',name:'משפחה לבדיקה',case_number:'F-001',status:'meeting_done'}],meetings:[{id:'m1',family_id:'f1',status:'completed'}],familyServices:[] as {id:string;family_id:string;status:string}[],analysisTasks:[] as {id:string;family_id:string;status:string}[],executionTasks:[] as {id:string;family_id:string;status:string}[],familyTasks:[] as {id:string;family_id:string;status:string}[],followUps:[] as {id:string;family_id:string;status:string}[],finalReports:[] as FinalReport[],finalReportHistory:[] as ReportSnapshot[],timeline:[] as {id:string;family_id:string;title:string;created_at:string}[]});
const save={p_meeting_id:'m1',p_expected_revision:0,p_content:content};
const approve={p_meeting_id:'m1',p_expected_revision:1,p_treatment_complete:true,p_reviewed:true};
describe('automatic final report lifecycle',()=>{
 it('saves during a call but requires completion before final approval',()=>{
  const s=fixture();s.meetings[0].status='in_progress';reportOperation('rpc_save_final_report',save,s,'representative');expect(s.finalReports[0].status).toBe('draft');expect(()=>reportOperation('rpc_approve_final_report',approve,s,'representative')).toThrow('REPORT_TREATMENT_OPEN');s.meetings[0].status='completed';reportOperation('rpc_approve_final_report',approve,s,'representative');expect(s.families[0].status).toBe('completed');expect(s.finalReports[0].snapshot).toMatchObject({family_name:'משפחה לבדיקה',revision:2,facts:content.facts});
 });
 it.each(['familyServices','analysisTasks','executionTasks','familyTasks','followUps'] as const)('does not approve while %s still contains pending treatment',key=>{
  const s=fixture();s[key].push({id:'open',family_id:'f1',status:'in_progress'});reportOperation('rpc_save_final_report',save,s,'admin');expect(()=>reportOperation('rpc_approve_final_report',approve,s,'admin')).toThrow('REPORT_TREATMENT_OPEN');s[key][0].status='completed';expect(reportReadiness(s,'m1')).toEqual([]);
 });
 it('also blocks another unfinished family meeting but ignores unrelated families',()=>{const s=fixture();s.meetings.push({id:'m2',family_id:'f1',status:'scheduled'});expect(reportReadiness(s,'m1')).toHaveLength(1);s.meetings[1].family_id='other';expect(reportReadiness(s,'m1')).toEqual([]);});
 it('requires both representative confirmations and rejects unconfirmed financial facts',()=>{
  const s=fixture();reportOperation('rpc_save_final_report',{...save,p_content:{...content,facts:[{...content.facts[0],confirmed:false}]}},s,'admin');expect(()=>reportOperation('rpc_approve_final_report',{...approve,p_reviewed:false},s,'admin')).toThrow('VALIDATION');expect(()=>reportOperation('rpc_approve_final_report',{...approve,p_treatment_complete:false},s,'admin')).toThrow('VALIDATION');expect(()=>reportOperation('rpc_approve_final_report',approve,s,'admin')).toThrow('REPORT_INCOMPLETE');expect(s.finalReportHistory).toEqual([]);
 });
 it('permits a report without monetary savings only with an explicit explanation',()=>{
  const s=fixture();reportOperation('rpc_save_final_report',{...save,p_content:{...content,facts:[]}},s,'admin');expect(()=>reportOperation('rpc_approve_final_report',approve,s,'admin')).toThrow('REPORT_INCOMPLETE');reportOperation('rpc_save_final_report',{...save,p_expected_revision:1,p_content:{...content,facts:[],no_savings_reason:'לא נמדד חיסכון כספי; הטיפול הסתיים בארגון המסמכים.'}},s,'admin');reportOperation('rpc_approve_final_report',{...approve,p_expected_revision:2},s,'admin');expect(s.finalReports[0].status).toBe('approved');
 });
 it('does not overwrite approved content; corrections withdraw publication and require a fresh approval',()=>{
  const s=fixture();reportOperation('rpc_save_final_report',save,s,'admin');reportOperation('rpc_approve_final_report',approve,s,'admin');expect(()=>reportOperation('rpc_save_final_report',{...save,p_expected_revision:2},s,'admin')).toThrow('INVALID_STATE');reportOperation('rpc_reopen_final_report',{p_meeting_id:'m1',p_expected_revision:2},s,'admin');expect(s.finalReports[0]).toMatchObject({status:'draft',snapshot:null,revision:3});expect(s.finalReportHistory).toHaveLength(1);expect(s.finalReportHistory[0].facts).toEqual(content.facts);
  reportOperation('rpc_save_final_report',{...save,p_expected_revision:3,p_content:{...content,outcome:'סיכום מעודכן שנכתב על ידי הנציג.'}},s,'admin');reportOperation('rpc_approve_final_report',{...approve,p_expected_revision:4},s,'admin');expect(s.finalReportHistory).toHaveLength(2);expect(s.finalReportHistory[0].outcome).toBe(content.outcome);expect(s.finalReportHistory[1].outcome).not.toBe(content.outcome);
 });
 it('rejects stale writes and repeated approval without changing existing data',()=>{
  const s=fixture();reportOperation('rpc_save_final_report',save,s,'admin');expect(()=>reportOperation('rpc_save_final_report',save,s,'admin')).toThrow('CONFLICT');reportOperation('rpc_approve_final_report',approve,s,'admin');expect(()=>reportOperation('rpc_approve_final_report',approve,s,'admin')).toThrow('CONFLICT');expect(s.finalReports).toHaveLength(1);expect(s.finalReportHistory).toHaveLength(1);
 });
 it('rejects duplicate facts before any record mutation',()=>{const s=fixture();expect(()=>reportOperation('rpc_save_final_report',{...save,p_content:{...content,facts:[content.facts[0],content.facts[0]]}},s,'admin')).toThrow('DUPLICATE_FACT');expect(s.finalReports).toEqual([]);});
 it('does not reuse caller-provided family identity or generated totals',()=>{const s=fixture();reportOperation('rpc_save_final_report',{...save,p_content:{...content,family_name:'forged',annual_savings:9000000}},s,'admin');reportOperation('rpc_approve_final_report',{...approve,p_family_name:'forged'},s,'admin');expect(s.finalReports[0].snapshot?.family_name).toBe('משפחה לבדיקה');expect('annual_savings' in s.finalReports[0]).toBe(false);});
 it.each(['client','marketer','professional'])('rejects all final report writes from %s',role=>{for(const name of ['rpc_save_final_report','rpc_approve_final_report','rpc_reopen_final_report'])expect(()=>reportOperation(name,save,fixture(),role)).toThrow('PERMISSION_DENIED');});
 it('rejects unknown and cancelled meetings',()=>{const s=fixture();expect(()=>reportOperation('rpc_save_final_report',{...save,p_meeting_id:'unknown'},s,'admin')).toThrow('PERMISSION_DENIED');s.meetings[0].status='cancelled';expect(()=>reportOperation('rpc_save_final_report',save,s,'admin')).toThrow('INVALID_STATE');});
 it.each(['','-1','1.111','NaN','1e2'])('rejects invalid unsigned report amount %s',value=>expect(()=>parseReportMoney(value)).toThrow('VALIDATION'));
 it('preserves exact zero, cents and signed one-off costs',()=>{expect(parseReportMoney('0')).toBe(0);expect(parseReportMoney('10.29')).toBe(1029);expect(parseReportMoney('-3.49',true)).toBe(-349);});
});
describe('demo report projection',()=>{
 beforeEach(()=>{resetDemo();selectRole('representative');});
 it('does not expose a draft to a client, professional or marketer',async()=>{
  await rpc('rpc_save_final_report',save);for(const role of ['client','professional','marketer'] as const){selectRole(role);expect((await loadWorkspace()).finalReports).toEqual([]);await expect(rpc('rpc_save_final_report',save)).rejects.toThrow('PERMISSION_DENIED');}
 });
 it('enforces readiness even through a direct approval RPC',async()=>{await rpc('rpc_save_final_report',save);await expect(rpc('rpc_approve_final_report',approve)).rejects.toThrow('REPORT_TREATMENT_OPEN');expect((await loadWorkspace()).finalReports[0].status).toBe('draft');});
 it('shows an approved snapshot only to its own family, and withdraws it when reopened',async()=>{
  await rpc('rpc_save_final_report',save);let w=await loadWorkspace();for(const t of w.followUps)await rpc('rpc_set_followup_status',{p_id:t.id,p_status:'cancelled',p_expected_revision:t.revision});for(const t of w.familyTasks)await rpc('rpc_set_family_task_status',{p_id:t.id,p_status:'cancelled',p_expected_revision:t.revision});
  selectRole('professional');await rpc('rpc_start_execution',{p_task_id:'e1'});await rpc('rpc_report_execution_complete',{p_task_id:'e1',p_outcome:'done',p_summary:'הטיפול הושלם ונבדק',p_result:'עודכנו עמלות הבנק',p_value:100});selectRole('representative');await rpc('rpc_approve_execution',{p_task_id:'e1'});await rpc('rpc_approve_final_report',approve);
  selectRole('client');w=await loadWorkspace();expect(w.finalReports).toHaveLength(1);expect(w.finalReports[0].snapshot?.facts).toEqual(content.facts);selectRole('representative');await rpc('rpc_reopen_final_report',{p_meeting_id:'m1',p_expected_revision:2});selectRole('client');expect((await loadWorkspace()).finalReports).toEqual([]);
 });
});
