import {describe,expect,it} from 'vitest';
import {chapterProgress} from './chapter-progress';
describe('questionnaire chapter progress',()=>{
 it('does not mark optional or empty chapters completed',()=>{
  const steps=chapterProgress({});expect(steps.find(s=>s.chapter.key==='family')?.remaining).toBeGreaterThan(0);
  expect(steps.find(s=>s.chapter.key==='rights')).toMatchObject({required:0,filled:0,remaining:0});
 });
 it('includes mortgage only for ownership and does not erase hidden answers',()=>{
  const answers={housing:'own',has_mortgage:'yes',mort_bank:'leumi',mort_balance:'400000',mort_monthly:'3000'};
  expect(chapterProgress(answers).find(s=>s.chapter.key==='mortgage')).toMatchObject({required:1,remaining:0});
  expect(chapterProgress({...answers,housing:'family'}).some(s=>s.chapter.key==='mortgage')).toBe(false);
  expect(answers.mort_bank).toBe('leumi');
 });
 it('recounts partner requirements when marital status changes',()=>{
  const single=chapterProgress({marital:'single'}).find(s=>s.chapter.key==='family')!;
  const married=chapterProgress({marital:'married'}).find(s=>s.chapter.key==='family')!;
  expect(married.required-single.required).toBe(3);expect(married.remaining-single.remaining).toBe(3);
 });
 it('counts numeric zero as filled and employment arrays correctly',()=>{
  expect(chapterProgress({bank_count:0}).find(s=>s.chapter.key==='banks')).toMatchObject({filled:1,remaining:0});
  expect(chapterProgress({h_emp:[]}).find(s=>s.chapter.key==='work')?.remaining).toBe(1);
  expect(chapterProgress({h_emp:['none']}).find(s=>s.chapter.key==='work')?.remaining).toBe(0);
 });
 it('adds optional weddings when children are present without inventing required fields',()=>{
  expect(chapterProgress({children:[]}).some(s=>s.chapter.key==='weddings')).toBe(false);
  expect(chapterProgress({children:[{name:'דוגמה'}]}).at(-1)).toMatchObject({chapter:{key:'weddings'},required:0});
 });
});
