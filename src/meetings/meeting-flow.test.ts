import {describe,it,expect} from 'vitest';
import {clientSummary,meetingProgress,decisionNext,nextOpenTopic} from './meeting-flow';
import type {MeetingItem} from '../lib/model';
const item:MeetingItem={id:'one',meeting_id:'m1',family_id:'f1',title:'Public title',client_summary:'Public summary',client_decision:null,visible_to_client:true,decision_note:'PRIVATE',execution_instructions:'INSTRUCTIONS',approved_actions:[{private:'ACTION'}],current_situation:'INTERNAL FINDING'};
describe('meeting preparation and public summary',()=>{
 it('advances past decided and internal items, wrapping to earlier open topics',()=>{
  const items=[item,{...item,id:'saved',client_decision:'progress'},{...item,id:'internal',visible_to_client:false},{...item,id:'last'}];
  expect(nextOpenTopic(items,'one')?.id).toBe('last');
  expect(nextOpenTopic(items,'last')?.id).toBe('one');
  expect(nextOpenTopic(items,'unknown')?.id).toBe('one');
 });
 it('finishes when only the just-saved topic or internal topics remain',()=>{
  expect(nextOpenTopic([item,{...item,id:'internal',visible_to_client:false}],'one')).toBeUndefined();
  expect(nextOpenTopic([],'one')).toBeUndefined();
 });
 it('never includes private fields or hidden topics in the preview',()=>{
  const result=clientSummary([item,{...item,id:'hidden',title:'HIDDEN',visible_to_client:false}]);
  expect(result).toEqual([{id:'one',title:'Public title',client_summary:'Public summary',client_decision:null}]);
  expect(item.decision_note).toBe('PRIVATE');
 });
 it('counts null and undecided as missing, but does not block on a private topic',()=>{
  const progress=meetingProgress([item,{...item,id:'two',client_decision:'undecided'},{...item,id:'three',client_decision:'thinking'},{...item,id:'hidden',visible_to_client:false}]);
  expect(progress.total).toBe(3);expect(progress.decided).toBe(1);expect(progress.missing.map(i=>i.id)).toEqual(['one','two']);
 });
 it('explains the different responsibilities after each decision',()=>{
  expect(decisionNext('progress')).toContain('ישייך בעל מקצוע');
  expect(decisionNext('thinking')).toContain('המשפחה תשקול');
  expect(decisionNext('declined')).toContain('לא יועבר');
  expect(decisionNext(null)).toContain('לפני סיום');
 });
 it('gives customers their own next action instead of staff instructions',()=>{
  expect(decisionNext(null,'client')).toContain('תחליטו יחד');
  expect(decisionNext('thinking','client')).toContain('עדכנו את הנציג');
  expect(decisionNext('progress','client')).toContain('שאישרתם');
  expect(decisionNext('declined','client')).toContain('אפשר לפנות לנציג');
 });
});
