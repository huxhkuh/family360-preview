import {describe,it,expect} from 'vitest';
import {missingAnswers} from './questionnaire-validation';
import {CHAPTERS} from './questionnaire-definition';
describe('household conditions',()=>{
 it.each(['single','divorced','widowed',undefined])('does not require partner details for %s',marital=>{
  const answers={marital,w_emp:'emp'};
  expect(missingAnswers(answers,[]).some(f=>f.key.startsWith('w_'))).toBe(false);
  for(const key of ['family','work'])expect(CHAPTERS.find(c=>c.key===key)!.secs.filter(s=>!s.cond||s.cond(answers)).some(s=>s.fields?.some(f=>f.k.startsWith('w_')))).toBe(false);
 });
 it('requires current partner details and applicable employment fields when married',()=>{
  const fields=missingAnswers({marital:'married',w_emp:'emp'},[]).map(f=>f.key);
  expect(fields).toEqual(expect.arrayContaining(['w_first','w_id','w_dob','w_work','w_gross']));
 });
 it('does not erase stored answers when their section is hidden',()=>{
  const answers={marital:'divorced',w_first:'שם שמור',w_emp:'emp',w_work:'מקום שמור'};
  const before=structuredClone(answers);missingAnswers(answers,[]);expect(answers).toEqual(before);
  expect(missingAnswers({...answers,marital:'married'},[]).map(f=>f.key)).not.toContain('w_first');
 });
});
