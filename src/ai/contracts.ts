import {z} from 'zod';

export const fieldLabels={owner:'בעל המסמך',period:'תקופת הדוח',employer:'מעסיק',gross_salary:'שכר ברוטו',net_salary:'שכר נטו',employee_deposit:'הפרשת עובד',employer_deposit:'הפרשת מעסיק',provider:'גוף מנהל',product:'מוצר או מסלול',balance:'יתרה',deposit_fee:'דמי ניהול מהפקדות',balance_fee:'דמי ניהול מצבירה',coverage:'כיסוי ביטוחי',premium:'עלות הביטוח',valid_until:'תוקף',monthly_payment:'החזר חודשי',interest:'ריבית',remaining_term:'תקופה שנותרה',bank_fees:'עמלות בנק'} as const;
export const documentKinds={payslip:'תלוש שכר',pension:'דוח פנסיה וחיסכון',insurance:'מסמך ביטוח',mortgage:'מסמך משכנתא',bank:'מסמך בנק',other:'מסמך אחר'};
const short=z.string().trim().min(1).max(500);
export const extractionSchema=z.object({kind:z.enum(['payslip','pension','insurance','mortgage','bank','other']),owner:z.string().max(150),period:z.string().max(100),pages:z.array(z.object({page:z.number().int().min(1).max(250),text:z.string().max(22000)})).min(1).max(250),fields:z.array(z.object({key:z.enum(Object.keys(fieldLabels) as [keyof typeof fieldLabels,...(keyof typeof fieldLabels)[]]),value:short,unit:z.enum(['ILS','percent','text','date']),owner:z.string().max(150),period:z.string().max(100),page:z.number().int().min(1).max(250),quote:short})).max(100),warnings:z.array(short).max(15)});
export type Extraction=z.infer<typeof extractionSchema>;
export type ExtractedField=Extraction['fields'][number];
export type FieldReview={field_id:string;value:string;status:'confirmed'|'rejected';note:string;reviewed_by:string;reviewed_at:string};
export type AiSource={id:string;label:string;value:string;kind:'reported'|'document'|'professional'|'work'|'conversation'|'guide';document_id?:string;page?:number;quote?:string};
export type BriefTopic={key:string;title:string;question:string;explain:string;needs:string[]};
export type BriefInput={sources:AiSource[];topics:BriefTopic[];coverage:{key:string;title:string;shown:boolean;source_ids:string[]}[]};
const cited=z.object({text:z.string().trim().min(1).max(700),sources:z.array(z.string().min(1).max(240)).min(1).max(20)});
export const briefSchema=z.object({summary:z.array(cited).max(5),topics:z.array(z.object({key:z.string().min(1).max(150),relevance:z.enum(['discuss','clarify','not_relevant']),reason:cited,ask:z.string().min(1).max(500),explain:z.string().min(1).max(700),needs:z.array(short).max(6)})).max(150)});
export type AiBrief=z.infer<typeof briefSchema>;
export type AiJob={id:string;kind:'document'|'brief';status:'queued'|'processing'|'review'|'ready'|'failed'|'stale';revision:number;result:Extraction|AiBrief|null;reviews:FieldReview[];sources:AiSource[];error_code:string|null;created_at:string;updated_at:string;demo?:boolean;input?:BriefInput};
export type AiState={configured:boolean;job:AiJob|null};
export function normalizeEvidence(s:string){return s.normalize('NFKC').replace(/[\u200e\u200f\u202a-\u202e]/g,'').replace(/\s+/g,' ').trim();}
export function checkedExtraction(value:unknown):Extraction{
 const result=extractionSchema.parse(value),pages=new Map(result.pages.map(p=>[p.page,normalizeEvidence(p.text)]));
 if(pages.size!==result.pages.length||result.fields.some(f=>!pages.get(f.page)?.includes(normalizeEvidence(f.quote))||!normalizeEvidence(f.quote).includes(normalizeEvidence(f.value))))throw Error('AI_OUTPUT_INVALID');
 return result;
}
export function checkedBrief(value:unknown,input:BriefInput):AiBrief{
 const result=briefSchema.parse(value),sources=new Set(input.sources.map(s=>s.id)),keys=new Set(input.topics.map(t=>t.key));
 const statements=[...result.summary,...result.topics.map(t=>t.reason)];
 if(result.topics.length!==keys.size||new Set(result.topics.map(t=>t.key)).size!==keys.size||result.topics.some(t=>!keys.has(t.key))||statements.some(s=>s.sources.some(id=>!sources.has(id))))throw Error('AI_OUTPUT_INVALID');
 return result;
}
