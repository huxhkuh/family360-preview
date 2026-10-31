import {describe,it,expect} from 'vitest';
import {captureReferral,pendingReferral,clearReferral} from './referral';
function memory(){const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);}};}
describe('referral across signup',()=>{
 it('retains the latest valid referral when navigating or returning from email confirmation, then clears after case creation',()=>{const s=memory();captureReferral('?ref=partner-123',s,1000);captureReferral('?other=1',s,2000);expect(pendingReferral(s,3000)).toBe('partner-123');clearReferral(s);expect(pendingReferral(s,4000)).toBeUndefined();});
 it('ignores invalid codes and expires old attribution',()=>{const s=memory();captureReferral('?ref=partner_1',s,1000);captureReferral('?ref=%3Cbad%3E',s,2000);expect(pendingReferral(s,3000)).toBe('partner_1');expect(pendingReferral(s,1000+31*24*60*60*1000)).toBeUndefined();});
});
