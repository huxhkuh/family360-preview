import {z} from 'zod';
import {commissionTotals,type GrowthStore} from './referrals';
const entry=z.object({p_id:z.string().min(1).max(100),p_partner_id:z.string(),p_kind:z.enum(['credit','payout']),p_referral_id:z.string().nullable().optional().default(null),p_amount_agorot:z.number().int().positive().max(100000000),p_note:z.string().trim().min(3).max(500)});
export function growthOperation(name:string,args:Record<string,unknown>,store:GrowthStore,role:string){
 if(name!=='rpc_record_commission')return undefined;
 if(role!=='admin')throw Error('PERMISSION_DENIED');
 const parsed=entry.safeParse(args);if(!parsed.success)throw Error('VALIDATION');const a=parsed.data;
 if(!store.partners.some(p=>p.id===a.p_partner_id&&p.active))throw Error('VALIDATION');
 if(a.p_referral_id&&!store.referrals.some(r=>r.public_id===a.p_referral_id&&r.partner_id===a.p_partner_id))throw Error('VALIDATION');
 const old=store.entries.find(e=>e.id===a.p_id);if(old){if(old.partner_id!==a.p_partner_id||old.kind!==a.p_kind||(old.referral_id??null)!==a.p_referral_id||old.amount_agorot!==a.p_amount_agorot||old.note!==a.p_note)throw Error('CONFLICT');return old;}
 if(a.p_kind==='payout'&&a.p_amount_agorot>commissionTotals(store.entries.filter(e=>e.partner_id===a.p_partner_id)).balance)throw Error('INSUFFICIENT_BALANCE');
 const row={id:a.p_id,partner_id:a.p_partner_id,kind:a.p_kind,referral_id:a.p_referral_id,amount_agorot:a.p_amount_agorot,note:a.p_note,created_at:new Date().toISOString()};store.entries.push(row);return row;
}
