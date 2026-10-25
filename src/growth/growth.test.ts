import {beforeEach,describe,it,expect} from 'vitest';
import {createGrowthStore,registerReferral,referralLink,commissionTotals,publicCaseStatus} from './referrals';
import {growthOperation} from './growth-operations';
import {SERVICE_PRICE_AGOROT,parseMoney} from './service-price';
import {resetDemo,selectRole,startClientIntake,loadWorkspace,rpc} from '../lib/backend';
import {readRoute,routeHash} from '../lib/navigation';

beforeEach(()=>{resetDemo();selectRole('admin');});
describe('service price and referral attribution',()=>{
 it('uses 490 shekels and preserves exact agorot',()=>{expect(SERVICE_PRICE_AGOROT).toBe(49000);expect(parseMoney('490')).toBe(49000);expect(parseMoney('13.29')).toBe(1329);});
 it.each(['0','-3','1.999','1e3','Infinity','','1000000.01'])('rejects invalid ledger amount %s',value=>expect(()=>parseMoney(value)).toThrow('VALIDATION'));
 it('attributes once to the first active partner and never invents commissions',()=>{
  const s=createGrowthStore();expect(registerReferral(s,'unknown','new')).toBeNull();s.partners[1].active=false;expect(registerReferral(s,'mesudarim-demo-b','new')).toBeNull();s.partners[1].active=true;
  const first=registerReferral(s,'mesudarim-demo-a','new');expect(registerReferral(s,'mesudarim-demo-b','new')).toBe(first);expect(s.referrals.filter(r=>r.family_id==='new')).toHaveLength(1);expect(s.entries).toEqual([]);
 });
 it('builds a clean shareable link with encoded attribution',()=>expect(referralLink('a&b','https://example.test/demo/?old=1#/private')).toBe('https://example.test/demo/?ref=a%26b'));
 it('uses broad public status only',()=>{expect(publicCaseStatus('waiting_docs')).toBe('in_treatment');expect(publicCaseStatus('archived')).toBe('completed');expect(publicCaseStatus('cancelled')).toBe('cancelled');});
 it.each(['referrals','telephone'] as const)('round trips %s route',page=>expect(readRoute(routeHash({page}))).toEqual({page}));
 it('retains link attribution when moving between demo roles',async()=>{
  startClientIntake('mesudarim-demo-a');startClientIntake('mesudarim-demo-b');selectRole('marketer');const w=await loadWorkspace();expect(w.referrals).toHaveLength(3);expect(w.commissionEntries).toEqual([]);
 });
});
describe('commission ledger',()=>{
 const credit={p_id:'credit',p_partner_id:'partner1',p_kind:'credit',p_amount_agorot:4900,p_note:'אישור ידני לצורך הבדיקה'};
 it('records exact credits and payouts, permits retry once and blocks changing an existing entry',()=>{
  const s=createGrowthStore();growthOperation('rpc_record_commission',credit,s,'admin');growthOperation('rpc_record_commission',credit,s,'admin');expect(s.entries).toHaveLength(1);
  expect(()=>growthOperation('rpc_record_commission',{...credit,p_amount_agorot:5000},s,'admin')).toThrow('CONFLICT');
  growthOperation('rpc_record_commission',{...credit,p_id:'paid',p_kind:'payout',p_amount_agorot:1900},s,'admin');expect(commissionTotals(s.entries)).toEqual({earned:4900,paid:1900,balance:3000});
 });
 it('blocks overpayment atomically even when attempts arrive back to back',()=>{
  const s=createGrowthStore();growthOperation('rpc_record_commission',credit,s,'admin');const p={...credit,p_kind:'payout',p_id:'pay'};growthOperation('rpc_record_commission',p,s,'admin');
  expect(()=>growthOperation('rpc_record_commission',{...p,p_id:'second'},s,'admin')).toThrow('INSUFFICIENT_BALANCE');expect(s.entries).toHaveLength(2);
 });
 it('can attach a commission to its own public referral but cannot attach another marketer’s referral',()=>{
  const s=createGrowthStore();expect(()=>growthOperation('rpc_record_commission',{...credit,p_referral_id:'REF-201'},s,'admin')).toThrow('VALIDATION');expect(s.entries).toHaveLength(0);
  growthOperation('rpc_record_commission',{...credit,p_referral_id:'REF-101'},s,'admin');expect(s.entries[0].referral_id).toBe('REF-101');expect(()=>growthOperation('rpc_record_commission',{...credit,p_referral_id:'REF-102'},s,'admin')).toThrow('CONFLICT');
 });
 it.each([0,-1,1.5,100000001,NaN])('rejects invalid agorot %s',amount=>expect(()=>growthOperation('rpc_record_commission',{...credit,p_amount_agorot:amount},createGrowthStore(),'admin')).toThrow('VALIDATION'));
 it.each(['client','representative','professional','marketer'])('prevents %s from writing the ledger',role=>expect(()=>growthOperation('rpc_record_commission',credit,createGrowthStore(),role)).toThrow('PERMISSION_DENIED'));
 it('exposes only the signed-in demo marketer projection without private case data',async()=>{
  await rpc('rpc_record_commission',credit);await rpc('rpc_record_commission',{...credit,p_id:'other',p_partner_id:'partner2'});selectRole('marketer');const w=await loadWorkspace();
  expect(w.partners.map(p=>p.id)).toEqual(['partner1']);expect(w.referrals.map(r=>r.id)).toEqual(['REF-101','REF-102']);expect(w.commissionEntries).toHaveLength(1);
  for(const key of ['families','documents','analysisTasks','executionTasks','familyTasks','familyContacts','timeline','profiles','professionals','representatives','audit','notifications'] as const)expect(w[key]).toEqual([]);
  expect('resources' in w).toBe(false);expect(JSON.stringify(w)).not.toMatch(/משפחת פרידמן|internal_notes|family_id|mesudarim-demo-b/);expect(w.familyDirectoryEnabled).toBe(false);
  await expect(rpc('rpc_search_families',{})).rejects.toThrow('PERMISSION_DENIED');await expect(rpc('rpc_record_commission',credit)).rejects.toThrow('PERMISSION_DENIED');
 });
});

describe('telephone service in the same family case',()=>{
 const call=async()=>({p_id:'phone-test',p_family_id:'f1',p_expected_updated_at:(await loadWorkspace()).families.find(f=>f.id==='f1')!.updated_at,p_verified:true,p_summary:'תיעוד פנימי רגיש שלא יועתק ללקוח',p_channel:'phone',p_callback:true,p_due_on:'2026-11-10'});
 it('records contact, preferred channel and one callback; retries cannot duplicate or modify the request',async()=>{
  const a=await call();await rpc('rpc_telephone_contact',a);await rpc('rpc_telephone_contact',a);let w=await loadWorkspace();expect(w.familyContacts.filter(c=>c.id===a.p_id)).toHaveLength(1);expect(w.familyTasks.filter(t=>t.id==='callback:'+a.p_id)).toHaveLength(1);expect(w.families[0].preferred_channel).toBe('phone');expect(w.timeline.some(t=>t.id==='phone:'+a.p_id)).toBe(true);
  await expect(rpc('rpc_telephone_contact',{...a,p_callback:false})).rejects.toThrow('CONFLICT');selectRole('client');w=await loadWorkspace();expect(w.families[0].preferred_channel).toBe('phone');expect(w.familyContacts).toEqual([]);expect(JSON.stringify(w)).not.toContain(a.p_summary);
 });
 it('requires identity attestation and validates callback date before any mutation',async()=>{
  const a=await call();for(const patch of [{p_verified:false},{p_due_on:'2026-02-30'},{p_due_on:''},{p_summary:' '}])await expect(rpc('rpc_telephone_contact',{...a,...patch})).rejects.toThrow('VALIDATION');
  const w=await loadWorkspace();expect(w.familyContacts.some(c=>c.id===a.p_id)).toBe(false);expect(w.familyTasks.some(t=>t.id==='callback:'+a.p_id)).toBe(false);expect(w.families[0].updated_at).toBe(a.p_expected_updated_at);
 });
 it('blocks stale writes without creating a callback',async()=>{const a=await call();await expect(rpc('rpc_telephone_contact',{...a,p_expected_updated_at:'old'})).rejects.toThrow('CONFLICT');expect((await loadWorkspace()).familyContacts.some(c=>c.id===a.p_id)).toBe(false);});
 it('can save a phone contact without scheduling a callback',async()=>{const a=await call();await rpc('rpc_telephone_contact',{...a,p_callback:false,p_due_on:''});expect((await loadWorkspace()).familyTasks.some(t=>t.id==='callback:'+a.p_id)).toBe(false);});
 it.each(['professional','client','marketer'] as const)('blocks telephone mutation by %s',async role=>{const a=await call();selectRole(role);await expect(rpc('rpc_telephone_contact',a)).rejects.toThrow('PERMISSION_DENIED');});
});
