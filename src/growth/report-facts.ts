import {z} from 'zod';

// Numerical facts are entered and confirmed by a representative. No prose or AI
// output can change these totals. Amounts are integer agorot throughout.
const amount=z.number().int().min(0).max(100000000000);
const common={id:z.string().min(1).max(100),description:z.string().trim().min(1).max(300),source:z.string().trim().min(1).max(500),confirmed:z.boolean(),result:z.enum(['realized','potential'])};
export const fact=z.discriminatedUnion('kind',[
 z.object({...common,kind:z.literal('recurring'),period:z.enum(['month','year']),before_agorot:amount,after_agorot:amount}),
 z.object({...common,kind:z.literal('one_off'),amount_agorot:z.number().int().min(-100000000000).max(100000000000)}),
]);
export type ReportFact=z.infer<typeof fact>;
export function summarizeReportFacts(input:unknown){
 const parsed=z.array(fact).max(1000).safeParse(input);if(!parsed.success)throw Error('VALIDATION');
 const ids=new Set<string>();for(const row of parsed.data){if(ids.has(row.id))throw Error('DUPLICATE_FACT');ids.add(row.id);}
 const result={realized:{monthly_agorot:0,annual_agorot:0,one_off_agorot:0,monthly_is_approximate:false},potential:{monthly_agorot:0,annual_agorot:0,one_off_agorot:0,monthly_is_approximate:false},unconfirmed_ids:[] as string[]};
 for(const row of parsed.data){
  if(!row.confirmed){result.unconfirmed_ids.push(row.id);continue;}
  const total=result[row.result];
  if(row.kind==='one_off')total.one_off_agorot+=row.amount_agorot;
  else total.annual_agorot+=(row.before_agorot-row.after_agorot)*(row.period==='month'?12:1);
 }
 for(const group of [result.realized,result.potential]){group.monthly_agorot=Math.round(group.annual_agorot/12)||0;group.monthly_is_approximate=group.annual_agorot%12!==0;}
 return result;
}
