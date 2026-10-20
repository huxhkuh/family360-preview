import {beforeEach,describe,it,expect} from 'vitest';
import {toggleAnswer,validApproxDate,initialAnswers} from './questionnaire-decisions';
import {questionnaireDiscussion} from './questionnaire-discussion';
import {questionnaireIssues} from './questionnaire-validation';
import {documentPreparation} from '../companion/document-preparation';
import {loadWorkspace,rpc,startClientIntake,selectRole} from '../lib/backend';
import {validDemoAnswers} from './questionnaire-fixture';
import {clientReadyToWait} from '../ClientCompletion';
beforeEach(()=>{startClientIntake();selectRole('client');});
async function save(answers:Record<string,unknown>){const f=(await loadWorkspace()).families[0];return rpc('rpc_save_family',{p_family_id:f.id,p_expected_updated_at:f.updated_at,p_patch:{answers}});}
describe('confirmed questionnaire decisions',()=>{
 it('keeps none and unknown explicit and exclusive without losing normal multiselection',()=>{
  expect(toggleAnswer(['pension'],'dk',true,['none','dk'])).toEqual(['dk']);
  expect(toggleAnswer(['dk'],'pension',true,['none','dk'])).toEqual(['pension']);
  expect(toggleAnswer(['pension'],'deposits',true,['none','dk'])).toEqual(['pension','deposits']);
  expect(questionnaireIssues({...validDemoAnswers,savings:['dk','pension']},[]).some(i=>i.key==='savings')).toBe(true);
 });
 it('accepts approximate and historic full dates, rejects future and invalid calendar dates',()=>{
  for(const date of ['2018','2018-06','2018-06-21'])expect(validApproxDate(date,'2026-10-20')).toBe(true);
  for(const date of ['2018-13','2018-02-30','2030','abc'])expect(validApproxDate(date,'2026-10-20')).toBe(false);
  expect(questionnaireIssues({...validDemoAnswers,owns_property:'yes',has_mortgage:'yes',mort_date:'2018',mortgages:[{mort_date:'2030'}]},[]).map(i=>i.key)).toContain('mortgages.0.mort_date');
 });
 it('offers owned-property mortgage preparation to renters and preserves hidden answers',()=>{
  const a={housing:'rent',owns_property:'yes',has_mortgage:'yes',mortgages:[{mort_property:'השקעה',mort_date:'2010'}]};
  expect(documentPreparation(a).some(p=>p.key==='mortgage_balance')).toBe(true);
  expect(documentPreparation({...a,owns_property:'no'}).some(p=>p.key==='mortgage_balance')).toBe(false);
  expect(a.mortgages[0].mort_date).toBe('2010');
 });
 it('suggests all general-guide documents conditionally, never bank statements',()=>{
  const keys=documentPreparation({...validDemoAnswers,h_emp:['emp','self'],housing:'rent',owns_property:'yes',has_mortgage:'yes',loans:[{balance:100}],savings:['pension']}).map(p=>p.key);
  expect(keys).toEqual(expect.arrayContaining(['identity_h','clearinghouse_auth_h','bank_identity','municipal_bill','electricity_bill','pension_report','loan_statements','mortgage_balance','rental_contract','payslips_h','tax_assessment_h']));
  expect(keys).not.toContain('bank_statements');expect(keys).not.toContain('identity_w');
 });
 it('initializes phone from the case, preserves intentional edits and synchronizes valid saved changes',async()=>{
  let f=(await loadWorkspace()).families[0];expect(initialAnswers(f).h_phone).toBe('0500000000');
  expect(initialAnswers({...f,answers:{h_phone:''}}).h_phone).toBe('');
  await save({...validDemoAnswers,h_phone:'0520000000'});f=(await loadWorkspace()).families[0];expect(f.phone).toBe('0520000000');
  await rpc('rpc_save_family',{p_family_id:f.id,p_expected_updated_at:f.updated_at,p_patch:{phone:'0530000000'}});
  f=(await loadWorkspace()).families[0];expect(f.answers?.h_phone).toBe('0530000000');
  await save({...f.answers,h_phone:'123'});f=(await loadWorkspace()).families[0];expect(f.phone).toBe('0530000000');expect(f.answers?.h_phone).toBe('123');
 });
 it('rejects stale saves atomically, preserving the new phone and answers',async()=>{
  const old=(await loadWorkspace()).families[0];await save({...validDemoAnswers,h_phone:'0520000000'});
  await expect(rpc('rpc_save_family',{p_family_id:'f1',p_expected_updated_at:old.updated_at,p_patch:{answers:{h_phone:'0540000000'}}})).rejects.toThrow('CONFLICT');
  const f=(await loadWorkspace()).families[0];expect(f.phone).toBe('0520000000');expect(f.answers?.h_first).toBe(validDemoAnswers.h_first);
 });
 it('retains explicit no, unknown and missing amounts as distinct staff conversation topics',()=>{
  const topics=questionnaireDiscussion({...validDemoAnswers,h_emp:['emp'],savings:['none'],ins:['dk'],ravkav_review:'yes'});
  expect(topics.find(t=>t.key==='savings')?.value).toBe('אין חסכונות');
  expect(topics.find(t=>t.key==='ins')?.value).toBe('לא יודעים');
  expect(topics.find(t=>t.key==='h_gross')?.value).toContain('לא נמסר');
  expect(topics.some(t=>t.key==='w_gross')).toBe(false);
 });
 it('records staff-only discussion notes without editing answers; changed answers need rechecking',async()=>{
  await save({...validDemoAnswers,savings:['dk']});selectRole('representative');
  let f=(await loadWorkspace()).families[0];const topic=questionnaireDiscussion(f.answers!).find(t=>t.key==='savings')!;
  await rpc('rpc_review_questionnaire_topic',{p_family_id:'f1',p_key:topic.key,p_token:topic.token,p_note:'נברר יחד בשיחה הבאה',p_expected_updated_at:f.updated_at});
  f=(await loadWorkspace()).families[0];expect(f.questionnaire_reviews?.savings.token).toBe(topic.token);expect(f.answers?.savings).toEqual(['dk']);
  selectRole('client');expect((await loadWorkspace()).families[0].questionnaire_reviews).toBeUndefined();
  await expect(rpc('rpc_review_questionnaire_topic',{p_family_id:'f1'})).rejects.toThrow('PERMISSION_DENIED');
  await save({...validDemoAnswers,savings:['none']});selectRole('representative');f=(await loadWorkspace()).families[0];
  expect(questionnaireDiscussion(f.answers!).find(t=>t.key==='savings')!.token).not.toBe(f.questionnaire_reviews?.savings.token);
  await expect(rpc('rpc_review_questionnaire_topic',{p_family_id:'f1',p_key:'savings',p_token:topic.token,p_note:'old',p_expected_updated_at:f.updated_at})).rejects.toThrow('CONFLICT');
 });
 it('keeps authorization separate, optional for submission and impossible to attach as a file',async()=>{
  await save(validDemoAnswers);await rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'clearinghouse_auth_h'});
  let w=await loadWorkspace();const doc=w.documents[0];expect(doc).toMatchObject({optional:true,type:'signature',status:'missing'});
  await expect(rpc('rpc_demo_attach_example',{p_document_id:doc.id})).rejects.toThrow('VALIDATION');
  await rpc('rpc_complete_onboarding',{p_family_id:'f1'});w=await loadWorkspace();expect(clientReadyToWait(w.families[0],w)).toBe(true);
  expect(w.documents).toHaveLength(1);expect(w.documents[0].status).toBe('missing');
 });
});
