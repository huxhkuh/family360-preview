import {describe,it,expect} from 'vitest';
import {chapterNavigationIssues,questionnaireIssues} from './questionnaire-validation';

describe('partial questionnaire navigation',()=>{
 it('allows missing contact answers during progress but requires them for submission',()=>{
  const answers={h_phone:'  ',h_id:''};
  expect(chapterNavigationIssues(answers,[],'family')).toEqual([]);
  expect(questionnaireIssues(answers,[]).some(i=>i.key==='h_phone')).toBe(true);
 });
 it('still blocks entered invalid contact details in their own chapter',()=>{
  const answers={h_phone:'123'};
  expect(chapterNavigationIssues(answers,[],'family').map(i=>i.key)).toContain('h_phone');
  expect(chapterNavigationIssues(answers,[],'housing')).toEqual([]);
 });
});
