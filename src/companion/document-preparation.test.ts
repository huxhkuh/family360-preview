import {beforeEach,describe,expect,it} from 'vitest';
import {documentPreparation} from './document-preparation';
import {loadWorkspace,rpc,selectRole,startClientIntake} from '../lib/backend';

beforeEach(()=>{startClientIntake();selectRole('client');});
async function save(answers:Record<string,unknown>){
 const w=await loadWorkspace();
 await rpc('rpc_save_family',{p_family_id:'f1',p_patch:{answers},p_expected_updated_at:w.families[0].updated_at});
}
describe('contextual document preparation',()=>{
 it('does not request documents from unanswered questions or empty repeat rows',()=>{
  expect(documentPreparation({})).toEqual([]);
  expect(documentPreparation({loans:[{}, {balance:''}],bank_count:''})).toEqual([]);
 });
 it('supports simultaneous occupations but never uses stale spouse or mortgage answers',()=>{
  const rules=documentPreparation({h_emp:['emp','self'],w_emp:'emp',marital:'single',housing:'rent',has_mortgage:'yes'});
  expect(rules.map(r=>r.key)).toEqual(['payslips_h','tax_assessment_h','rental_contract']);
  expect(documentPreparation({marital:'married',w_emp:'emp'}).map(r=>r.key)).toEqual(['payslips_w']);
 });
 it('removes preparation prompts when the relevant answer changes',()=>{
  expect(documentPreparation({housing:'rent'})).toHaveLength(1);
  expect(documentPreparation({housing:'family',has_mortgage:'yes'})).toHaveLength(0);
  expect(documentPreparation({loans:[{balance:0}]}).map(r=>r.key)).toEqual(['loan_statements']);
 });
 it('creates one pending sample from saved answers, without a file upload',async()=>{
  await save({housing:'rent'});
  await Promise.all([1,2].map(()=>rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'})));
  const w=await loadWorkspace();expect(w.documents).toHaveLength(1);
  expect(w.documents[0]).toMatchObject({key:'rental_contract',status:'pending',file_name:'דוגמה מדומה — לא הועלה קובץ'});
  expect(w.documents[0].storage_path).toBeUndefined();
 });
 it('rejects a rule unrelated to saved answers and leaves no partial request',async()=>{
  await expect(rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'})).rejects.toThrow('VALIDATION');
  expect((await loadWorkspace()).documents).toHaveLength(0);
 });
 it('does not erase an uploaded document when answers change',async()=>{
  await save({housing:'rent'});await rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'});
  await save({housing:'own',has_mortgage:'no'});
  await expect(rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'})).rejects.toThrow('VALIDATION');
  expect((await loadWorkspace()).documents[0].status).toBe('pending');
 });
 it('retains approval and allows a rejected sample to return for review',async()=>{
  await save({housing:'rent'});await rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'});
  const doc=(await loadWorkspace()).documents[0];
  selectRole('representative');await rpc('rpc_review_document',{p_document_id:doc.id,p_approved:false,p_reason:'חסר עמוד'});
  selectRole('client');await rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'});
  expect((await loadWorkspace()).documents[0]).toMatchObject({status:'pending',reject_reason:null});
  selectRole('representative');await rpc('rpc_review_document',{p_document_id:doc.id,p_approved:true});
  selectRole('client');await rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'});
  expect((await loadWorkspace()).documents[0].status).toBe('approved');
 });
 it('denies access to other families and professional roles',async()=>{
  await expect(rpc('rpc_demo_prepare_document',{p_family_id:'f2',p_key:'rental_contract'})).rejects.toThrow('PERMISSION_DENIED');
  selectRole('professional');
  await expect(rpc('rpc_demo_prepare_document',{p_family_id:'f1',p_key:'rental_contract'})).rejects.toThrow('PERMISSION_DENIED');
 });
});
