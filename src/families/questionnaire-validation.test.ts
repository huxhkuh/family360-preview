import {describe,it,expect} from 'vitest';
import {missingAnswers,questionnaireIssues} from './questionnaire-validation';
import {validDemoAnswers} from './questionnaire-fixture';
import {CHAPTERS} from './questionnaire-definition';
import {questionnaireReview} from './questionnaire-review';
import {documentPreparation} from '../companion/document-preparation';
describe('household conditions',()=>{
 it('allows submission without optional location and email details',()=>{
  const answers={...validDemoAnswers,address:'',city:'',h_email:''};
  expect(missingAnswers(answers,[])).toEqual([]);
  expect(questionnaireIssues(answers,[])).toEqual([]);
 });
 it.each(['h_id','h_dob','h_phone','h_first','h_last','marital','h_emp','housing','has_car','bank_count'])('still blocks submission without %s',key=>{
  expect(questionnaireIssues({...validDemoAnswers,[key]:''},[]).map(f=>f.key)).toContain(key);
 });
 it('allows employed married owners to defer details while retaining document requests and visible follow-ups',()=>{
  const answers={...validDemoAnswers,city:'',h_email:'',marital:'married',w_first:'דוגמה',w_id:'000000018',w_dob:'1991-01-01',h_emp:['emp','self'],w_emp:['emp'],housing:'own',has_mortgage:'yes'};
  expect(questionnaireIssues(answers,[])).toEqual([]);
  expect(documentPreparation(answers).map(d=>d.key)).toEqual(expect.arrayContaining(['payslips_h','payslips_w','tax_assessment_h','mortgage_balance']));
  const rows=questionnaireReview(answers,[]).flatMap(c=>c.items);
  expect(rows.filter(r=>r.value.includes('להשלמה'))).toHaveLength(4);
  expect(questionnaireReview({...answers,h_gross:0},[]).flatMap(c=>c.items).some(r=>r.label==='שכר חודשי ברוטו (₪)'&&r.value==='0')).toBe(true);
  for(const key of ['w_id','w_dob','w_emp'])expect(questionnaireIssues({...answers,[key]:''},[]).map(f=>f.key)).toContain(key);
  expect(questionnaireIssues({...answers,mort_monthly:-1},[]).map(f=>f.key)).toContain('mort_monthly');
 });
 it('allows unknown or omitted rental aid and tracks missing rent without blocking submission',()=>{
  for(const rent_aid_now of ['', 'dk']){
   const answers={...validDemoAnswers,housing:'rent',rent_aid_now};
   expect(questionnaireIssues(answers,[])).toEqual([]);
   expect(documentPreparation(answers).map(d=>d.key)).toContain('rental_contract');
   expect(questionnaireReview(answers,[]).flatMap(c=>c.items).some(r=>r.value.includes('מחוזה השכירות'))).toBe(true);
  }
 });
 it('still validates optional data when supplied',()=>{
  expect(questionnaireIssues({...validDemoAnswers,h_email:'invalid'},[]).map(f=>f.key)).toContain('h_email');
  expect(questionnaireIssues({...validDemoAnswers,h_emp:['emp'],h_gross:-1},[]).map(f=>f.key)).toContain('h_gross');
 });
 it('does not list follow-ups for hidden sections',()=>{
  const rows=questionnaireReview({...validDemoAnswers,w_emp:['emp'],has_mortgage:'yes'},[]).flatMap(c=>c.items);
  expect(rows.some(r=>r.value.includes('להשלמה'))).toBe(false);
 });
 it.each(['single','divorced','widowed',undefined])('does not require partner details for %s',marital=>{
  const answers={marital,w_emp:'emp'};
  expect(missingAnswers(answers,[]).some(f=>f.key.startsWith('w_'))).toBe(false);
  for(const key of ['family','work'])expect(CHAPTERS.find(c=>c.key===key)!.secs.filter(s=>!s.cond||s.cond(answers)).some(s=>s.fields?.some(f=>f.k.startsWith('w_')))).toBe(false);
 });
 it('requires current partner details and applicable employment fields when married',()=>{
  const fields=missingAnswers({marital:'married',w_emp:'emp'},[]).map(f=>f.key);
  expect(fields).toEqual(expect.arrayContaining(['w_first','w_id','w_dob']));
  expect(fields).not.toEqual(expect.arrayContaining(['w_work','w_gross']));
 });
 it('does not erase stored answers when their section is hidden',()=>{
  const answers={marital:'divorced',w_first:'שם שמור',w_emp:'emp',w_work:'מקום שמור'};
  const before=structuredClone(answers);missingAnswers(answers,[]);expect(answers).toEqual(before);
  expect(missingAnswers({...answers,marital:'married'},[]).map(f=>f.key)).not.toContain('w_first');
 });
});
