export type PublicCaseStatus='registered'|'in_treatment'|'completed'|'cancelled';
export const caseStatusLabels:Record<PublicCaseStatus,string>={registered:'נרשם',in_treatment:'בטיפול',completed:'הטיפול הסתיים',cancelled:'בוטל'};
export function publicCaseStatus(status:string):PublicCaseStatus{
 if(['completed','closed','archived'].includes(status))return 'completed';
 if(['cancelled'].includes(status))return 'cancelled';
 if(['new','registered'].includes(status))return 'registered';
 return 'in_treatment';
}
export type Partner={id:string;name:string;code:string;active:boolean};
export type Referral={id:string;partner_id:string;family_id:string;public_id:string;registered_at:string};
export type CommissionEntry={id:string;partner_id:string;kind:'credit'|'payout';referral_id?:string|null;amount_agorot:number;note:string;created_at:string};
export type GrowthStore={partners:Partner[];referrals:Referral[];entries:CommissionEntry[]};
export function createGrowthStore():GrowthStore{
 return {partners:[{id:'partner1',name:'משווק לדוגמה',code:'mesudarim-demo-a',active:true},{id:'partner2',name:'מפנה נוסף לדוגמה',code:'mesudarim-demo-b',active:true}],referrals:[{id:'r1',partner_id:'partner1',family_id:'f3',public_id:'REF-101',registered_at:'2026-10-20T10:00:00Z'},{id:'r2',partner_id:'partner1',family_id:'f2',public_id:'REF-102',registered_at:'2026-10-21T10:00:00Z'},{id:'r3',partner_id:'partner2',family_id:'f4',public_id:'REF-201',registered_at:'2026-10-22T10:00:00Z'}],entries:[]};
}
export function referralLink(code:string,base:string){const url=new URL(base);url.hash='';url.search='';url.searchParams.set('ref',code);return url.toString();}
export function registerReferral(store:GrowthStore,code:string,familyId:string){
 const partner=store.partners.find(p=>p.code===code&&p.active);if(!partner)return null;
 const existing=store.referrals.find(r=>r.family_id===familyId);if(existing)return existing;
 const row={id:crypto.randomUUID(),partner_id:partner.id,family_id:familyId,public_id:'REF-'+crypto.randomUUID().slice(0,8).toUpperCase(),registered_at:new Date().toISOString()};store.referrals.push(row);return row;
}
export function commissionTotals(entries:CommissionEntry[]){
 const earned=entries.filter(e=>e.kind==='credit').reduce((sum,e)=>sum+e.amount_agorot,0);const paid=entries.filter(e=>e.kind==='payout').reduce((sum,e)=>sum+e.amount_agorot,0);return {earned,paid,balance:earned-paid};
}
export function growthProjection(store:GrowthStore,role:string,families:{id:string;status:string}[]){
 const allowed=role==='admin'?store.partners:role==='marketer'?store.partners.filter(p=>p.id==='partner1'):[];
 const ids=new Set(allowed.map(p=>p.id));return {partners:allowed,referrals:store.referrals.filter(r=>ids.has(r.partner_id)).map(r=>({id:r.public_id,partner_id:r.partner_id,registered_at:r.registered_at,status:publicCaseStatus(families.find(f=>f.id===r.family_id)?.status||'new')})),commissionEntries:store.entries.filter(e=>ids.has(e.partner_id))};
}
