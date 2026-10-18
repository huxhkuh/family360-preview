import {describe,it,expect} from 'vitest';
import {createWorkingDrafts} from './working-drafts';
describe('working drafts',()=>{
 it('keeps separate records and only reports unsaved work',()=>{const s=createWorkingDrafts();s.set('meeting:a:item:1',{value:{note:'one'},dirty:true,label:'First'});s.set('meeting:b:item:1',{value:{note:'two'},dirty:true,label:'Second'});s.set('questionnaire:c',{value:{note:'saved'},dirty:false,label:'Saved'});expect(s.pending('meeting:a:')).toEqual([{key:'meeting:a:item:1',label:'First'}]);expect(s.pending()).toHaveLength(2);expect(s.get('meeting:b:item:1')?.value).toEqual({note:'two'});});
 it('clears account data and notifies mounted summaries',()=>{const s=createWorkingDrafts();let n=0;const off=s.subscribe(()=>n++);s.set('a',{value:'private draft',dirty:true,label:'A'});s.clear();expect(s.pending()).toEqual([]);expect(s.get('a')).toBeUndefined();expect(n).toBe(2);off();s.clear();expect(n).toBe(2);});
 it('keeps failed draft and its concurrency revision until an explicit successful save',()=>{const s=createWorkingDrafts();const value={note:'local edit',revision:3};s.set('a',{value,dirty:true,label:'A'});expect(s.get('a')).toEqual({value,dirty:true,label:'A'});s.set('a',{value:{...value,revision:4},dirty:false,label:'A'});expect(s.pending()).toEqual([]);});
});
