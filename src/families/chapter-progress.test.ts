import {describe,expect,it} from 'vitest';
import {chapterProgress,hasQuestionnaireAnswers} from './chapter-progress';
import {CHAPTERS} from './questionnaire-definition';
describe('questionnaire chapter progress',()=>{
 it('distinguishes an untouched or cleared questionnaire from actual answers, including zero',()=>{
  expect(hasQuestionnaireAnswers({})).toBe(false);
  expect(hasQuestionnaireAnswers({city:'  ',children:[{}],h_emp:[]})).toBe(false);
  expect(hasQuestionnaireAnswers({bank_count:0})).toBe(true);
  expect(hasQuestionnaireAnswers({children:[{name:'דוגמה'}]})).toBe(true);
 });
 it('does not mark optional or empty chapters completed',()=>{
  const steps=chapterProgress({});expect(steps.find(s=>s.chapter.key==='family')?.remaining).toBeGreaterThan(0);
  expect(steps.find(s=>s.chapter.key==='rights')).toMatchObject({required:1,filled:0,remaining:1});
  expect(chapterProgress({water_persons:'dk'}).find(s=>s.chapter.key==='rights')).toMatchObject({required:1,filled:1,remaining:0});
 });
 it('includes mortgage only for ownership and does not erase hidden answers',()=>{
  const answers={housing:'own',has_mortgage:'yes',mort_bank:'leumi',mort_balance:'400000',mort_monthly:'3000'};
  expect(chapterProgress(answers).find(s=>s.chapter.key==='mortgage')).toMatchObject({required:2,filled:1,remaining:1});
  expect(chapterProgress({...answers,mort_refi:'dk'}).find(s=>s.chapter.key==='mortgage')).toMatchObject({required:2,filled:2,remaining:0});
  expect(chapterProgress({...answers,housing:'family'}).some(s=>s.chapter.key==='mortgage')).toBe(false);
  expect(answers.mort_bank).toBe('leumi');
 });
 it('recounts partner requirements when marital status changes',()=>{
  const single=chapterProgress({marital:'single'}).find(s=>s.chapter.key==='family')!;
  const married=chapterProgress({marital:'married'}).find(s=>s.chapter.key==='family')!;
  expect(married.required-single.required).toBe(4);expect(married.remaining-single.remaining).toBe(4);
 });
 it('counts numeric zero as filled and employment arrays correctly',()=>{
  expect(chapterProgress({bank_count:0}).find(s=>s.chapter.key==='banks')).toMatchObject({required:0,filled:0,remaining:0});
  const fields=CHAPTERS.find(c=>c.key==='banks')!.secs[0].fields!;
  const requiredNumber={k:'test_required_number',l:'מספר בדיקה',type:'number',req:1};
  fields.push(requiredNumber);
  try {
   expect(chapterProgress({test_required_number:0}).find(s=>s.chapter.key==='banks')).toMatchObject({required:1,filled:1,remaining:0});
   expect(chapterProgress({test_required_number:''}).find(s=>s.chapter.key==='banks')).toMatchObject({required:1,filled:0,remaining:1});
  } finally { fields.splice(fields.indexOf(requiredNumber),1); }
  expect(chapterProgress({h_emp:[]}).find(s=>s.chapter.key==='work')?.remaining).toBe(2);
  expect(chapterProgress({h_emp:['none']}).find(s=>s.chapter.key==='work')?.remaining).toBe(1);
  expect(chapterProgress({h_emp:['none'],h_work_continuity:'dk'}).find(s=>s.chapter.key==='work')).toMatchObject({required:2,filled:2,remaining:0});
 });
 it('adds optional weddings when children are present without inventing required fields',()=>{
  expect(chapterProgress({children:[]}).some(s=>s.chapter.key==='weddings')).toBe(false);
  expect(chapterProgress({children:[{name:'דוגמה'}]}).at(-1)).toMatchObject({chapter:{key:'weddings'},required:0});
 });
});
