import {describe,it,expect} from 'vitest';
import {employed,toggleEmployment} from './employment';
import {conditionMatches} from './core';
import {missingAnswers} from '../families/questionnaire-validation';
import {CHAPTERS} from '../families/questionnaire-definition';
describe('combined employment',()=>{
 it('keeps legacy scalar selections while allowing simultaneous work',()=>{
  expect(employed({h_emp:'emp'},'h','emp')).toBe(true);
  expect(toggleEmployment('emp','self',true)).toEqual(['emp','self']);
  expect(toggleEmployment(['emp','self'],'emp',false)).toEqual(['self']);
  expect(toggleEmployment(['emp','self'],'none',true)).toEqual(['none']);
  expect(toggleEmployment('none','self',true)).toEqual(['self']);
 });
 it.each(['h_emp','w_emp'])('matches existing service rules for %s',field=>{
  for(const kind of ['emp','self']){
   expect(conditionMatches({[field]:['emp','self']},{field,op:'equals',value:kind})).toBe(true);
   expect(conditionMatches({[field]:['emp','self']},{field,op:'not_equals',value:kind})).toBe(false);
   expect(conditionMatches({[field]:kind},{field,op:'contains',value:kind})).toBe(true);
  }
  expect(conditionMatches({[field]:[]},{field,op:'not_equals',value:'none'})).toBe(false);
 });
 it('shows both employee and self-employed details without requiring optional data or a hidden spouse',()=>{
  const answers={marital:'single',h_emp:['emp','self'],w_emp:['emp','self']};
  const keys=missingAnswers(answers,[]).map(x=>x.key);
  for(const key of ['h_work','h_gross','h_biz_type'])expect(keys).not.toContain(key);
  expect(keys.some(k=>k.startsWith('w_'))).toBe(false);
  const shown=CHAPTERS.find(c=>c.key==='work')!.secs.filter(s=>!s.cond||s.cond(answers)).flatMap(s=>(s.fields||[]).filter(f=>!f.cond||f.cond(answers)).map(f=>f.k));
  expect(shown).toEqual(expect.arrayContaining(['h_work','h_gross','h_biz_type']));
  expect(missingAnswers({...answers,marital:'married'},[]).map(x=>x.key)).toEqual(expect.arrayContaining(['w_first','w_id','w_dob']));
 });
 it('keeps detailed answers when a work selection is removed and puts loans after insurance',()=>{
  const answers={marital:'single',h_emp:['self'],h_work:'Stored job',h_gross:5000};const before=structuredClone(answers);
  expect(missingAnswers(answers,[]).map(x=>x.key)).not.toContain('h_work');expect(answers).toEqual(before);
  expect(CHAPTERS.map(c=>c.key).indexOf('loans')).toBe(CHAPTERS.map(c=>c.key).indexOf('insurance')+1);
 });
});
