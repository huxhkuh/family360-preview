import {describe,it,expect} from 'vitest';
import {summarizeReportFacts,type ReportFact} from './report-facts';
const recurring:ReportFact={id:'bank-fees',description:'עמלות הבנק',source:'אישור הבנק שנבדק בידי הנציג',confirmed:true,result:'realized',kind:'recurring',period:'month',before_agorot:15000,after_agorot:5000};
describe('representative-confirmed report numbers',()=>{
 it('calculates monthly and annual savings and keeps potential and one-off benefits separate',()=>{
  const r=summarizeReportFacts([recurring,{...recurring,id:'potential',result:'potential',before_agorot:20000},{id:'refund',description:'החזר חד פעמי',source:'אישור קבלה',confirmed:true,result:'realized',kind:'one_off',amount_agorot:50000}]);
  expect(r.realized).toEqual({monthly_agorot:10000,annual_agorot:120000,one_off_agorot:50000,monthly_is_approximate:false});expect(r.potential.annual_agorot).toBe(180000);
 });
 it('does not count unconfirmed numbers and preserves zero',()=>{const r=summarizeReportFacts([{...recurring,confirmed:false},{...recurring,id:'zero',after_agorot:15000}]);expect(r.unconfirmed_ids).toEqual(['bank-fees']);expect(r.realized.annual_agorot).toBe(0);});
 it('keeps a cost increase negative rather than concealing it as savings',()=>expect(summarizeReportFacts([{...recurring,after_agorot:16000}]).realized.annual_agorot).toBe(-12000));
 it('preserves annual precision and marks rounded monthly equivalents',()=>{const r=summarizeReportFacts([{...recurring,period:'year',before_agorot:100000,after_agorot:0}]);expect(r.realized.annual_agorot).toBe(100000);expect(r.realized.monthly_agorot).toBe(8333);expect(r.realized.monthly_is_approximate).toBe(true);});
 it('rejects duplicate facts to prevent counting the same line twice',()=>expect(()=>summarizeReportFacts([recurring,recurring])).toThrow('DUPLICATE_FACT'));
 it.each([{before_agorot:1.2},{before_agorot:-1},{source:''},{before_agorot:Infinity},{confirmed:undefined}])('rejects malformed manual facts %j',patch=>expect(()=>summarizeReportFacts([{...recurring,...patch}])).toThrow('VALIDATION'));
});
