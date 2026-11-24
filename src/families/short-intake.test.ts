import {describe,expect,it} from 'vitest';
import {shortChapters,shortIntakeVersion} from './short-intake';
import {chapterProgress} from './chapter-progress';
import {questionnaireIssues} from './questionnaire-validation';
import {validDemoAnswers} from './questionnaire-fixture';

describe('short family intake',()=>{
 it('keeps registration fields editable and asks for a child count',()=>{
  const fields=shortChapters[0].secs.flatMap(section=>section.fields?.map(field=>field.k)||[]);
  expect(fields).toEqual(expect.arrayContaining(['h_first','h_last','h_phone','h_email','city','address','children_count']));
  expect(fields).not.toContain('children');
 });
 it('can be submitted without deferred financial or rights questions',()=>{
  const {savings,ins,water_persons,bank_count,h_work_continuity,...retained}=validDemoAnswers;
  const answers={...retained,intake_version:shortIntakeVersion};
  expect(chapterProgress(answers).map(row=>row.chapter.key)).toEqual(['family','work','housing','insurance']);
  expect(questionnaireIssues(answers,[])).toEqual([]);
  expect(chapterProgress({...answers,housing:'own'}).map(row=>row.chapter.key)).toContain('mortgage');
  expect(questionnaireIssues({...answers,children_count:1.5},[]).map(issue=>issue.key)).toContain('children_count');
  expect(chapterProgress(validDemoAnswers).map(row=>row.chapter.key)).toContain('rights');
 });
});
