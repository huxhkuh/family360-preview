import type {Answers} from '../families/questionnaire-definition';
import {employed} from '../lib/employment';
export interface Preparation {key:string;chapter:string;name:string;reason:string;source:string;period:string}
// Demo preparation prompts, based on the existing DocumentGuide examples.
// These are not regulatory requirements or a replacement for staff requests.
export function documentPreparation(a:Answers):Preparation[]{
 const result:Preparation[]=[];
 const add=(key:string,chapter:string,name:string,reason:string,source:string,period:string)=>result.push({key,chapter,name,reason,source,period});
 for(const person of ['h','w'] as const){
  if(person==='w'&&a.marital!=='married')continue;
  const who=person==='h'?'שלך':'של בת הזוג';
  if(employed(a,person,'emp'))add(`payslips_${person}`,'work',`תלושי שכר ${who}`,`סימנתם עבודה כשכירים. התלושים עוזרים לבדוק את פרטי ההכנסה שנמסרו ${person==='w'?'עבור בת הזוג':'עבורך'}.`,'ממערכת השכר או מהמעסיק. בדמו משתמשים בדוגמה בלבד.','שלושת התלושים האחרונים');
  if(employed(a,person,'self'))add(`tax_assessment_${person}`,'work',`שומת מס ${who}`,'סימנתם עבודה כעצמאים. השומה מסייעת להשלמת תמונת ההכנסות.','מרואה החשבון או מהאזור האישי של רשות המסים.','השומה האחרונה הזמינה');
 }
 if(a.housing==='rent')add('rental_contract','housing','חוזה שכירות','סימנתם מגורים בשכירות. החוזה מאפשר להשוות לפרטי הדיור שמילאתם.','העותק שברשותכם או אצל המשכיר.','החוזה שבתוקף');
 if(a.housing==='own'&&a.has_mortgage==='yes')add('mortgage_balance','mortgage','דוח יתרות משכנתא','סימנתם משכנתא פעילה. הדוח מסייע לאמת את היתרה וההחזר.','האזור האישי בבנק, באזור המשכנתא.','הדוח העדכני הזמין');
 if(Array.isArray(a.loans)&&a.loans.some((r:Answers)=>r&&Object.values(r).some(v=>v!==''&&v!=null)))add('loan_statements','loans','פירוט ההלוואות הפעילות','הוספתם פרטי הלוואה. פירוט היתרות וההחזרים עוזר להשלים את התמונה.','מהגוף המלווה, עבור כל הלוואה שמילאתם.','פירוט עדכני');
 if(Number(a.bank_count)>0)add('bank_statements','banks','דפי חשבון בנק','סימנתם חשבון בנק. דפי החשבון עוזרים להשלים את בדיקת ההוצאות וההתחייבויות.','באזור האישי בבנק, תחת דפי חשבון.','שלושת החודשים האחרונים');
 return result;
}
