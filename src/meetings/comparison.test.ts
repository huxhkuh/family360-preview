import {describe,it,expect} from 'vitest';
import {amount,comparisonDelta,comparisonFinancial,comparisonGaps,readComparison} from './comparison';
describe('meeting comparisons',()=>{
 it('distinguishes unknown amounts from a confirmed zero and rejects invalid values',()=>{
  for(const v of [null,undefined,'', '  ',true,{},[],Infinity,NaN,-1,'-4',1e13])expect(amount(v)).toBeNull();
  expect(amount(0)).toBe(0);expect(amount('0')).toBe(0);expect(amount('314.50')).toBe(314.5);
 });
 it('does not manufacture a comparison from old savings or internal fields',()=>{
  const c=readComparison({monthly:314,internal_note:'PRIVATE',status:'unknown'});
  expect(c.current).toBeNull();expect(c.proposed).toBeNull();expect(comparisonDelta(c)).toBeNull();expect(c).not.toHaveProperty('internal_note');
 });
 it('calculates the signed expense or income difference without counting setup costs as recurring',()=>{
  const c=readComparison({current:4100,proposed:3786,status:'estimate',setup_cost:900});
  expect(comparisonDelta(c)).toBe(314);expect(comparisonFinancial({},c)).toMatchObject({monthly:314,yearly:3768});
  expect(comparisonDelta({...c,kind:'income'})).toBe(-314);
  expect(comparisonDelta({...c,current:10.1,proposed:10})).toBe(.1);
 });
 it('does not annualize one-off or annual figures',()=>{
  const c=readComparison({kind:'income',current:0,proposed:4800,status:'estimate',period:'one_off'});
  expect(comparisonFinancial({monthly:100,yearly:1200},c)).toEqual({comparison:c,lump:4800});
  expect(comparisonFinancial({}, {...c,period:'annual'})).toEqual({comparison:{...c,period:'annual'},yearly:4800});
 });
 it('removes stale positive totals when the new comparison is missing, qualitative, unchanged or more expensive',()=>{
  const c=readComparison({current:100,proposed:125,status:'estimate'});
  for(const next of [c,{...c,status:'missing' as const},{...c,kind:'qualitative' as const},{...c,proposed:100}]){
   expect(comparisonFinancial({monthly:10,yearly:120,lump:100,increase:50,other:300},next)).toEqual({comparison:next});
  }
 });
 it('lists missing evidence even when two amounts are present',()=>{
  const c=readComparison({current:100,proposed:90,status:'quote'});
  expect(comparisonGaps(c)).toHaveLength(5);
  expect(comparisonGaps({...c,current_source:'bill',proposed_source:'offer',basis:'same scope',conditions:'subject to acceptance',checked_on:'2026-10-15'})).toEqual([]);
 });
});
