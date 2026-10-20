import {hasOwnedProperty,type Answers} from '../families/questionnaire-definition';
import {employed} from '../lib/employment';
export interface Preparation {key:string;chapter:string;name:string;reason:string;source:string;period:string;type?:'signature'}
// Demo preparation prompts, based on the existing DocumentGuide examples.
// These are not regulatory requirements or a replacement for staff requests.
export function documentPreparation(a:Answers):Preparation[]{
 const result:Preparation[]=[];
 const add=(key:string,chapter:string,name:string,reason:string,source:string,period:string)=>result.push({key,chapter,name,reason,source,period});
 for(const person of ['h','w'] as const){
  if(person==='w'&&a.marital!=='married')continue;
  const who=person==='h'?'שלך':'של בן/בת הזוג';
  if(employed(a,person,'emp'))add(`payslips_${person}`,'work',`תלושי השכר ${who}`,`סימנתם עבודה כשכירים. התלושים עוזרים לבדוק את פרטי ההכנסה שנמסרו ${person==='w'?'עבור בן/בת הזוג':'עבורך'}.`,'ממערכת השכר או מהמעסיק. בדמו משתמשים בדוגמה בלבד.','שלושת התלושים האחרונים');
  if(employed(a,person,'self'))add(`tax_assessment_${person}`,'work',`שומת מס ${who}`,'סימנתם עבודה כעצמאים. השומה מסייעת לבדוק את פרטי ההכנסות.','מרואה החשבון או מהאזור האישי של רשות המסים.','השומה האחרונה הזמינה');
 }
 if(a.housing==='rent')add('rental_contract','housing','חוזה שכירות','סימנתם מגורים בשכירות. החוזה מאפשר להשוות לפרטי הדיור שמילאתם.','העותק שברשותכם או אצל המשכיר.','החוזה שבתוקף');
 if(hasOwnedProperty(a)&&a.has_mortgage==='yes')add('mortgage_balance','mortgage','דוח יתרות משכנתא','סימנתם משכנתא פעילה. הדוח מסייע לאמת את היתרה וההחזר.','האזור האישי בבנק, באזור המשכנתא.','הדוח העדכני הזמין');
 if(Array.isArray(a.loans)&&a.loans.some((r:Answers)=>r&&Object.values(r).some(v=>v!==''&&v!=null)))add('loan_statements','loans','פירוט ההלוואות הפעילות','הוספתם פרטי הלוואה. הדוח עוזר לבדוק את החוב שנותר ואת ההחזרים.','מהגוף המלווה, עבור כל הלוואה שמילאתם.','פירוט עדכני');
 if(Number(a.bank_count)>0)add('bank_identity','banks','תעודת זהות בנקאית — אם יש','סיכום של הפעילות והעלויות בבנק יכול לעזור לזהות מה כדאי לבדוק. אין צורך בדפי חשבון.','באזור האישי בבנק, תחת תעודת זהות בנקאית. אם אין לכם, אפשר להמשיך בלעדיה.','התעודה העדכנית שברשותכם');
 for(const person of ['h','w'] as const){
  if(person==='w'&&a.marital!=='married')continue;
  if(!a[person+'_id'])continue;
  const who=person==='h'?'שלך':'של בן/בת הזוג';
  add('identity_'+person,'family','תעודת זהות וספח '+who,'מיועדים לסוכן הביטוח לצורך הוצאת מידע מהמסלקה. צירוף המסמך אינו הרשאה להעבירו או לבצע פנייה.','צילום מלא וקריא של התעודה והספח. בדמו אין לצרף צילום אישי.','תעודה וספח מעודכנים');
  result.push({key:'clearinghouse_auth_'+person,chapter:'savings',name:'הרשאה למסלקה '+who,type:'signature',reason:'לפני פנייה של סוכן הביטוח למסלקה נדרשת גם חתימה על ההרשאה המתאימה. זו פעולה נפרדת מצירוף תעודת זהות.',source:'הנציג ישלים את נוסח ההרשאה של הסוכן, פרטי מקבל ההרשאה והיקפה. כרגע אפשר להשאיר להמשך בשיחה; אין שליחה לסוכן בדמו.',period:'לפי נוסח ההרשאה שיוצג לפני החתימה'});
 }
 if(['own','rent','family'].includes(a.housing)){
  add('municipal_bill','rights','חשבון ארנונה','יכול לסייע לנציג בבירור פרטי החיוב והאפשרות לבדוק הנחה.','חשבון שברשותכם או באזור האישי של הרשות המקומית.','חשבון עדכני, אם יש');
  add('electricity_bill','rights','חשבון חשמל','יכול לסייע לנציג בבירור פרטי החשבון והאפשרות לבדוק הטבה.','חשבון שברשותכם או באזור האישי של ספק החשמל.','חשבון עדכני, אם יש');
 }
 if(Array.isArray(a.savings)&&a.savings.includes('pension'))add('pension_report','savings','דוח פנסיה שנתי — אם יש','יכול לעזור לבדוק את המוצר הקיים ואת הנושאים שתרצו לשפר.','באזור האישי של הגוף המנהל, תחת דוחות שנתיים.','הדוח השנתי האחרון הזמין');
 return result;
}
