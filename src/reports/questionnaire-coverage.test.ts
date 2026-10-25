import {describe,it,expect} from 'vitest';
import {CHAPTERS} from '../families/questionnaire-definition';
import {buildQuestionnaireCoverage} from './questionnaire-coverage';
import {exampleAnswers} from './completed-example';
import {reportOperation} from './report-operations';
import type {FinalReport,ReportSnapshot} from './report-data';
describe('full questionnaire coverage',()=>{
 it('includes every maintained chapter and reports their actual answers rather than only financial results',()=>{
  const rows=buildQuestionnaireCoverage(exampleAnswers);expect(rows.map(r=>r.key)).toEqual(CHAPTERS.map(c=>c.key));expect(rows.every(r=>r.shown)).toBe(true);
  expect(JSON.stringify(rows.find(r=>r.key==='mortgage'))).toContain('650,000');expect(JSON.stringify(rows.find(r=>r.key==='loans'))).toContain('45,000');expect(JSON.stringify(rows.find(r=>r.key==='weddings'))).toContain('100,000');expect(rows.every(r=>r.review.status==='not_reviewed')).toBe(true);
 });
 it('distinguishes a conditionally hidden chapter from a representative decision that it is irrelevant',()=>{
  const rows=buildQuestionnaireCoverage({housing:'rent',owns_property:'no',children:[]});for(const key of ['mortgage','weddings']){const row=rows.find(r=>r.key===key)!;expect(row.shown).toBe(false);expect(row.review.status).toBe('not_reviewed');expect(row.items).toEqual([]);}
 });
 it('preserves missing data, explicit no, unknown, zero and empty collections as different states',()=>{
  const rows=buildQuestionnaireCoverage({h_emp:['emp'],h_net:0,has_car:'no',savings:['dk'],loans:[]});const items=rows.flatMap(r=>r.items);expect(items.find(i=>i.key==='h_gross')?.value).toContain('לא נמסר');expect(items.find(i=>i.key==='h_net')?.value).toContain('0');expect(items.find(i=>i.key==='has_car')?.value).toBe('לא');expect(items.find(i=>i.key==='savings')?.value).toBe('לא יודעים');expect(items.find(i=>i.key==='loans')?.value).toContain('אין להסיק');
 });
 it('uses repeat row conditions and options and masks identity numbers without dropping the topic',()=>{
  const rows=buildQuestionnaireCoverage(exampleAnswers),items=rows.flatMap(r=>r.items);expect(items.find(i=>i.key==='children.0.hmo')?.value).toBe('כללית');expect(items.find(i=>i.key==='h_id')?.value).toBe('מסתיים ב־0018');expect(JSON.stringify(rows)).not.toContain('000000018');expect(items.find(i=>i.key==='wt_1')?.label).toContain('ילד 2');
 });
 it('adds relevant configured service questions alongside the ten maintained chapters',()=>{
  const rows=buildQuestionnaireCoverage({custom_amount:99},[],[{id:'custom',name:'תחום נוסף',active:true,trigger_conditions:[],client_fields:[{key:'custom_amount',label:'נתון נוסף',type:'currency'}]}]);expect(rows.at(-1)?.key).toBe('service:custom');expect(rows.at(-1)?.items[0].value).toContain('99');
 });
 it('stores representative review separately from self-reported answers',()=>{
  const review={key:'insurance',status:'follow_up' as const,note:'נמסרה רשימת ביטוחים; נדרשת בדיקת פוליסות.'};const row=buildQuestionnaireCoverage(exampleAnswers,[review]).find(r=>r.key==='insurance')!;expect(row.review).toEqual(review);expect(row.items.some(i=>i.source.includes('לא אישור בדיקה מקצועית'))).toBe(true);
 });
});
describe('questionnaire snapshot approval',()=>{
 const content={facts:[],context:'מטרות המשפחה',outcome:'בוצעה שיחה וסוכמו הנתונים שנמסרו.',recommendations:'לעיין בסיכום.',no_savings_reason:'לא נמדד חיסכון כספי במסגרת הבדיקה.'};
 const state=()=>({families:[{id:'f',name:'לדוגמה',case_number:'F',answers:{city:'עיר ראשונה'}}],meetings:[{id:'m',family_id:'f',status:'completed'}],familyServices:[],analysisTasks:[],executionTasks:[],familyTasks:[],followUps:[],finalReports:[] as FinalReport[],finalReportHistory:[] as ReportSnapshot[],timeline:[] as {id:string;family_id:string;title:string;created_at:string}[]});
 it('ignores caller-supplied questionnaire snapshots and derives coverage from the family record',()=>{
  const s=state();reportOperation('rpc_save_final_report',{p_meeting_id:'m',p_expected_revision:0,p_content:{...content,questionnaire:[{title:'forged'}]}},s,'representative');expect(s.finalReports[0].questionnaire?.length).toBe(CHAPTERS.length);expect(JSON.stringify(s.finalReports[0].questionnaire)).toContain('עיר ראשונה');expect(JSON.stringify(s.finalReports[0])).not.toContain('forged');
 });
 it('requires renewed saving after questionnaire changes, then freezes the approved values',()=>{
  const s=state();reportOperation('rpc_save_final_report',{p_meeting_id:'m',p_expected_revision:0,p_content:content},s,'representative');s.families[0].answers.city='עיר שנייה';const approval={p_meeting_id:'m',p_expected_revision:1,p_treatment_complete:true,p_reviewed:true};expect(()=>reportOperation('rpc_approve_final_report',approval,s,'representative')).toThrow('REPORT_QUESTIONNAIRE_CHANGED');expect(s.finalReports[0].status).toBe('draft');reportOperation('rpc_save_final_report',{p_meeting_id:'m',p_expected_revision:1,p_content:content},s,'representative');reportOperation('rpc_approve_final_report',{...approval,p_expected_revision:2},s,'representative');s.families[0].answers.city='עיר שלישית';expect(JSON.stringify(s.finalReports[0].snapshot?.questionnaire)).toContain('עיר שנייה');expect(JSON.stringify(s.finalReports[0].snapshot?.questionnaire)).not.toContain('עיר שלישית');
 });
 it('rejects duplicate or unknown chapter decisions and undocumented claims of review',()=>{
  const review={key:'work',status:'conversation',note:'נבדק בשיחה'};for(const reviews of [[review,review],[{...review,key:'unknown'}],[{...review,note:''}]]){const s=state();expect(()=>reportOperation('rpc_save_final_report',{p_meeting_id:'m',p_expected_revision:0,p_content:{...content,chapter_reviews:reviews}},s,'representative')).toThrow('VALIDATION');expect(s.finalReports).toEqual([]);}
 });
});
