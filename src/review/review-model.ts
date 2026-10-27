import {chapterCompanionCopy} from './chapter-copy';
import {z} from 'zod';
import {CHAPTERS,type LegacyField} from './questionnaire-definition';
import {getQuestionHelp} from './questionnaire-help';
import {DOCUMENT_CATALOG,documentRequirementLabels} from './document-catalog';

export type ReviewItem={id:string;chapter:string;chapterTitle:string;kind:'chapter'|'question'|'option'|'document';sectionTitle?:string;label:string;meaning:string;guidance:string;example?:string;more?:string;currentRequirement:string;options?:string[];condition?:string;decision?:string};
export const reviewEntries:ReviewItem[]=CHAPTERS.flatMap(chapter=>{
 const items:ReviewItem[]=[{id:'chapter:'+chapter.key,chapter:chapter.key,chapterTitle:chapter.title,kind:'chapter',label:chapter.title,meaning:chapter.desc,guidance:chapterCompanionCopy[chapter.key]?.[1]||'',more:chapterCompanionCopy[chapter.key]?.[0],currentRequirement:'כותרת והקדמה לפרק'}];
 for(const section of chapter.secs){
  const visit=(field:LegacyField,path:string,context:string)=>{
   const help=getQuestionHelp(field.k),id=chapter.key+':'+path;
   const decision=field.k.endsWith('work_continuity')?'יצחק: להשאיר שאלה אחת הכוללת הפסקות עבודה או כמה מקומות עבודה. כן מסמן אפשרות לבדיקה, לא זכאות להחזר.':chapter.key==='rights'?'יצחק עדיין בוחן אילו שאלות נדרשות ומה נוכל לבדוק בפועל. השאלות נשארות כרשות עד להכרעה.':undefined;
   items.push({id,chapter:chapter.key,chapterTitle:chapter.title,kind:'question',sectionTitle:section.t,label:context+(field.l||({savings:'אילו חסכונות והשקעות יש לכם?',ins:'אילו ביטוחים קיימים?'} as Record<string,string>)[field.k]||field.k),meaning:help?.meaning||'',guidance:help?.guidance||'',example:help?.example,more:help?.more,currentRequirement:field.req?'חובה כיום':'רשות כיום',options:field.opts?.map(([,label])=>label),condition:[chapter.cond?'הפרק מופיע לפי תשובות קודמות':'',section.cond?'הקבוצה מופיעה לפי הרכב המשפחה':'',field.cond?'השאלה מופיעה בעקבות תשובה מתאימה':'',section.optional?'בקבוצת רשות':''].filter(Boolean).join(' · '),decision});
   for(const [value,label] of field.opts||[]){
    const option=getQuestionHelp(field.k,value);if(!option)continue;
    items.push({id:id+':option:'+value,chapter:chapter.key,chapterTitle:chapter.title,kind:'option',sectionTitle:section.t,label:context+label,meaning:option.meaning,guidance:option.guidance,example:option.example,more:option.more,currentRequirement:'הסבר לאפשרות תשובה',condition:'בתוך השאלה: '+(field.l||section.t)});
   }
   for(const sub of field.sub||[])visit(sub,path+'.'+sub.k,(field.l||section.t)+' — בכל שורה: ');
  };
  for(const field of section.fields||[])visit(field,field.k,'');
  if(section.dyn==='perChild')for(const [key,label] of [['wt','סכום שרוצים להכין לחתונה של כל ילד (₪)'],['wa','באיזה גיל של הילד תרצו שהסכום יהיה מוכן?']]){
   const help=getQuestionHelp(key);items.push({id:chapter.key+':'+key+'_{child}',chapter:chapter.key,chapterTitle:chapter.title,kind:'question',label,meaning:help?.meaning||'',guidance:help?.guidance||'',currentRequirement:'רשות כיום',condition:'שדה נפרד לכל ילד שהוזן בפרטי המשפחה'});
  }
 }
 return items;
});
export const documentReviewEntries:ReviewItem[]=DOCUMENT_CATALOG.map(d=>({id:'document:'+d.key,chapter:'documents',chapterTitle:'מסמכים והרשאות',kind:'document',label:d.name,meaning:d.reason,guidance:d.source,example:'תקופה: '+d.period,currentRequirement:documentRequirementLabels[d.requirement],decision:d.reviewNote}));
export const allReviewItems=[...reviewEntries,...documentReviewEntries];
const text=z.string().max(12000);
export const reviewEntrySchema=z.object({requirement:z.enum(['undecided','required','optional','remove']).optional(),wording:text.optional(),meaning:text.optional(),guidance:text.optional(),example:text.optional(),more:text.optional(),notes:text.optional(),checked:z.boolean().optional()}).strict();
export type ReviewEntry=z.infer<typeof reviewEntrySchema>;
export const reviewDraftSchema=z.object({schemaVersion:z.literal(1),reviewer:z.string().max(100),updatedAt:z.string(),entries:z.record(z.string(),reviewEntrySchema)}).strict();
export type ReviewDraft=z.infer<typeof reviewDraftSchema>;
export const REVIEW_STORAGE_KEY='mesudarim:questionnaire-review:v1';
export const emptyReview=():ReviewDraft=>({schemaVersion:1,reviewer:'יצחק',updatedAt:'',entries:{}});
export function parseReview(raw:string):ReviewDraft{
 if(raw.length>5_000_000)throw Error('קובץ ההערות גדול מדי.');
 const draft=reviewDraftSchema.parse(JSON.parse(raw)),validIds=new Set(allReviewItems.map(item=>item.id));
 if(Object.keys(draft.entries).some(id=>!validIds.has(id)))throw Error('בקובץ יש שאלות שאינן בגרסה הזאת. ההערות הקיימות לא הוחלפו.');
 return draft;
}
export const reviewSummary=(draft:ReviewDraft)=>({edited:Object.keys(draft.entries).length,checked:Object.values(draft.entries).filter(e=>e.checked).length});
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function reviewHtml(draft:ReviewDraft){
 const requirementLabels={undecided:'טרם הוחלט',required:'חובה לדעת הבודק',optional:'רשות לדעת הבודק',remove:'מציע להסיר'};
 const body=allReviewItems.filter(item=>draft.entries[item.id]).map(item=>{const entry=draft.entries[item.id];return '<article><h2>'+escape(item.chapterTitle+' — '+item.label)+'</h2><p>המצב כיום: '+escape(item.currentRequirement)+'</p><p>החלטת הבודק: '+escape(requirementLabels[entry.requirement||'undecided'])+'</p>'+(['wording','meaning','guidance','example','more','notes'] as const).filter(key=>entry[key]!==undefined).map(key=>'<p><b>'+({wording:'ניסוח מוצע',meaning:'הסבר מוצע',guidance:'הנחיה מוצעת',example:'דוגמה',more:'הרחבה',notes:'הערות'}[key])+':</b> '+escape(entry[key]||'')+'</p>').join('')+'<p>'+(entry.checked?'נבדק':'הבדיקה טרם הושלמה')+'</p></article>';}).join('');
 return '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>הערות על השאלון</title><style>body{max-width:900px;margin:40px auto;padding:20px;font:18px/1.8 Arial;color:#173d32}article{border-top:1px solid #ccc;margin:30px 0}p{white-space:pre-wrap}</style><h1>הערות על השאלון והמסמכים</h1><p>בודק: '+escape(draft.reviewer)+'</p><p>הצעות לבדיקה בלבד. לא שינו את שאלון הלקוחות.</p>'+body+'</html>';
}
