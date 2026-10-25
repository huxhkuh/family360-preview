import {z} from 'zod';
export const partnerSchema=z.object({id:z.string(),name:z.string(),code:z.string(),active:z.boolean()});
export const referralSchema=z.object({id:z.string(),partner_id:z.string(),registered_at:z.string(),status:z.enum(['registered','in_treatment','completed','cancelled'])});
export const commissionSchema=z.object({id:z.string(),partner_id:z.string(),kind:z.enum(['credit','payout']),referral_id:z.string().nullable().default(null),amount_agorot:z.number().int().nonnegative(),note:z.string(),created_at:z.string()});
