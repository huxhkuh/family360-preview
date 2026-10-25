import {chapterReviewSchema,coverageSchema} from './questionnaire-coverage';
import {z} from 'zod';
import {fact,summarizeReportFacts} from '../growth/report-facts';

export const reportContentSchema=z.object({facts:z.array(fact).max(50),chapter_reviews:z.array(chapterReviewSchema).max(100).optional(),context:z.string().trim().max(2000),outcome:z.string().trim().max(4000),recommendations:z.string().trim().max(4000),no_savings_reason:z.string().trim().max(1000)});
export type ReportContent=z.infer<typeof reportContentSchema>;
export const snapshotSchema=reportContentSchema.extend({questionnaire:z.array(coverageSchema).optional(),family_name:z.string(),case_number:z.string(),approved_by:z.string(),approved_at:z.string(),revision:z.number().int().positive()});
export type ReportSnapshot=z.infer<typeof snapshotSchema>;
export const finalReportSchema=reportContentSchema.extend({id:z.string(),meeting_id:z.string(),family_id:z.string(),revision:z.number().int().positive(),status:z.enum(['draft','approved']),updated_at:z.string(),questionnaire:z.array(coverageSchema).optional(),snapshot:snapshotSchema.nullable()});
export type FinalReport=z.infer<typeof finalReportSchema>;

export function parseReportMoney(value:string,signed=false){
 const pattern=signed?/^-?\d+(?:\.\d{1,2})?$/:/^\d+(?:\.\d{1,2})?$/;
 if(!pattern.test(value.trim()))throw Error('VALIDATION');
 const result=Math.round(Number(value)*100);if(!Number.isSafeInteger(result)||Math.abs(result)>100000000000)throw Error('VALIDATION');return result||0;
}
export function validateFinalContent(content:ReportContent){
 summarizeReportFacts(content.facts);
 if(content.context.length<3||content.outcome.length<10||content.recommendations.length<3||content.facts.some(f=>!f.confirmed)||(!content.facts.length&&content.no_savings_reason.length<10))throw Error('REPORT_INCOMPLETE');
}
type WorkItem={id:string;family_id:string;status:string};
export type ReportWork={meetings:WorkItem[];familyServices:WorkItem[];analysisTasks:WorkItem[];executionTasks:WorkItem[];familyTasks:WorkItem[];followUps:WorkItem[]};
export function reportReadiness(w:ReportWork,meetingId:string){
 const meeting=w.meetings.find(m=>m.id===meetingId);if(!meeting)return ['הפגישה אינה זמינה.'];
 const messages:string[]=[];
 if(meeting.status!=='completed')messages.push('יש לסיים את הפגישה לפני אישור הדוח הסופי.');
 const groups:[WorkItem[],string[],string][]=[
  [w.meetings.filter(m=>m.id!==meetingId),['completed','cancelled'],'פגישות נוספות שטרם הסתיימו'],
  [w.familyServices,['completed','not_completed','cancelled','client_declined','no_execution_needed'],'תחומי טיפול שטרם נסגרו'],
  [w.analysisTasks,['completed','approved','approved_analysis','cancelled','not_completed'],'משימות ניתוח שטרם נסגרו'],
  [w.executionTasks,['completed','not_completed','cancelled'],'משימות ביצוע שטרם נסגרו'],
  [w.familyTasks,['completed','cancelled'],'פעולות בתיק שטרם נסגרו'],
  [w.followUps,['completed','cancelled'],'משימות מעקב שטרם נסגרו'],
 ];
 for(const [rows,closed,label] of groups){const count=rows.filter(r=>r.family_id===meeting.family_id&&!closed.includes(r.status)).length;if(count)messages.push(`${label}: ${count}.`);}
 return messages;
}
