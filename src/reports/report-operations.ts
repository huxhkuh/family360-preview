import {buildQuestionnaireCoverage} from './questionnaire-coverage';
import {z} from 'zod';
import {reportContentSchema,reportReadiness,validateFinalContent,type FinalReport,type ReportSnapshot,type ReportWork} from './report-data';
import {summarizeReportFacts} from '../growth/report-facts';
type State=ReportWork&{families:{id:string;name:string;case_number:string;status?:string;updated_at?:string;answers?:Record<string,unknown>}[];services?:Parameters<typeof buildQuestionnaireCoverage>[2];finalReports:FinalReport[];finalReportHistory:ReportSnapshot[];timeline:{id:string;family_id:string;title:string;created_at:string}[]};
const base=z.object({p_meeting_id:z.string(),p_expected_revision:z.number().int().nonnegative()});
const save=base.extend({p_content:reportContentSchema});
const approve=base.extend({p_treatment_complete:z.literal(true),p_reviewed:z.literal(true)});
export function reportOperation(name:string,args:Record<string,unknown>,state:State,role:string){
 if(!['rpc_save_final_report','rpc_approve_final_report','rpc_reopen_final_report'].includes(name))return undefined;
 if(!['representative','admin'].includes(role))throw Error('PERMISSION_DENIED');
 const parsed=(name==='rpc_save_final_report'?save:name==='rpc_approve_final_report'?approve:base).safeParse(args);if(!parsed.success)throw Error('VALIDATION');
 const a=parsed.data,meeting=state.meetings.find(m=>m.id===a.p_meeting_id),family=state.families.find(f=>f.id===meeting?.family_id);
 if(!meeting||!family)throw Error('PERMISSION_DENIED');if(meeting.status==='cancelled')throw Error('INVALID_STATE');
 const record=state.finalReports.find(r=>r.meeting_id===meeting.id);
 if((record?.revision||0)!==a.p_expected_revision)throw Error('CONFLICT');
 const at=new Date().toISOString();
 if(name==='rpc_save_final_report'){
  if(record?.status==='approved')throw Error('INVALID_STATE');
  const content=save.parse(args).p_content;summarizeReportFacts(content.facts);
  const reviews=content.chapter_reviews||[];const questionnaire=buildQuestionnaireCoverage(family.answers||{},reviews,state.services||[]);const keys=new Set(questionnaire.map(c=>c.key));if(reviews.some(r=>!keys.has(r.key))||new Set(reviews.map(r=>r.key)).size!==reviews.length||reviews.some(r=>r.status!=='not_reviewed'&&r.note.length<3))throw Error('VALIDATION');
  const next:FinalReport={...content,questionnaire,id:'final-report:'+meeting.id,meeting_id:meeting.id,family_id:family.id,revision:(record?.revision||0)+1,status:'draft',updated_at:at,snapshot:null};
  if(record)Object.assign(record,next);else state.finalReports.push(next);return structuredClone(next);
 }
 if(!record)throw Error('REPORT_INCOMPLETE');
 if(name==='rpc_reopen_final_report'){
  if(record.status!=='approved')throw Error('INVALID_STATE');
  record.status='draft';record.snapshot=null;record.revision++;record.updated_at=at;
  state.timeline.push({id:crypto.randomUUID(),family_id:family.id,title:'הדוח הסופי הוחזר לתיקון ולאישור מחדש',created_at:at});return structuredClone(record);
 }
 if(record.status!=='draft')throw Error('INVALID_STATE');
 if(reportReadiness(state,meeting.id).length)throw Error('REPORT_TREATMENT_OPEN');
 validateFinalContent(record);
 if(record.questionnaire&&JSON.stringify(record.questionnaire)!==JSON.stringify(buildQuestionnaireCoverage(family.answers||{},record.chapter_reviews||[],state.services||[])))throw Error('REPORT_QUESTIONNAIRE_CHANGED');
 const snapshot:ReportSnapshot={...reportContentSchema.parse(record),questionnaire:buildQuestionnaireCoverage(family.answers||{},record.chapter_reviews||[],state.services||[]),family_name:family.name,case_number:family.case_number,approved_by:role==='admin'?'מנהל לדוגמה':'נציג לדוגמה',approved_at:at,revision:record.revision+1};
 family.status='completed';family.updated_at=new Date(Math.max(Date.now(),Date.parse(family.updated_at||'1970-01-01')+1)).toISOString();
 record.revision++;record.status='approved';record.updated_at=at;record.snapshot=structuredClone(snapshot);state.finalReportHistory.push(structuredClone(snapshot));
 state.timeline.push({id:crypto.randomUUID(),family_id:family.id,title:'אושר דוח סופי לאחר השלמת הטיפול',created_at:at});return structuredClone(record);
}
