import {describe,it,expect} from 'vitest';
import {CHAPTERS} from './questionnaire-definition';
import {getQuestionHelp} from './questionnaire-help';

describe('questionnaire explanations',()=>{
 it('explains every built-in field, including conditional and repeated fields',()=>{
  const fields=CHAPTERS.flatMap(c=>c.secs.flatMap(s=>s.fields||[])).flatMap(f=>[f,...(f.sub||[])]);
  for(const field of fields){
   const help=getQuestionHelp(field.k);
   expect(help,`${field.k}: ${field.l}`).toBeDefined();
   expect(help?.meaning.length).toBeGreaterThan(20);
   expect(help?.guidance.length).toBeGreaterThan(20);
  }
 });
 it('explains each technical choice with its own context',()=>{
  const groups=['savings','ins','extra_income','btl_allowances'];
  for(const field of CHAPTERS.flatMap(c=>c.secs.flatMap(s=>s.fields||[])).filter(f=>groups.includes(f.k))){
   for(const [value,label] of field.opts||[])expect(getQuestionHelp(field.k,value),`${field.k}: ${label}`).toBeDefined();
  }
  expect(getQuestionHelp('savings','other')).not.toEqual(getQuestionHelp('extra_income','other'));
  expect(getQuestionHelp('banks','other')).toBeUndefined();
 });
 it('uses the same gross/net definitions for either spouse and covers every child index',()=>{
  for(const term of ['gross','net']){
   expect(getQuestionHelp(`h_${term}`)).toEqual(getQuestionHelp(`w_${term}`));
   expect(getQuestionHelp(`h_${term}`)?.example).toBeTruthy();
  }
  expect(getQuestionHelp('h_gross')).not.toEqual(getQuestionHelp('h_net'));
  for(const prefix of ['wt','wa','wh','ws'])expect(getQuestionHelp(`${prefix}_12`)).toBeDefined();
  expect(getQuestionHelp('new_custom_question')).toBeUndefined();
 });
});
