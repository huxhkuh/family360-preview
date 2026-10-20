// Maintained questionnaire; preserve stored answer keys when editing.
import {employed} from "../lib/employment";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Answers=Record<string, any>;
export interface LegacyField { k:string;l?:string;type?:string;req?:number;followUp?:string;full?:number;opts?:string[][];cond?:(a:Answers)=>boolean;sub?:LegacyField[];addLabel?:string; }
export interface Chapter { key:string;title:string;icon:string;desc:string;cond?:(a:Answers)=>boolean;secs:{t:string;cond?:(a:Answers)=>boolean;fields?:LegacyField[];hint?:string;dyn?:string;optional?:boolean}[]; }
export const hasCurrentPartner=(a:Answers)=>a.marital==='married';
const yn=[['yes','כן'],['no','לא']];
export const CHAPTERS: Chapter[]=[
 {key:'family',title:'פרטי משפחה',icon:'documents',desc:'נתחיל בהיכרות בסיסית — ההרכב המשפחתי, הפרטים האישיים והילדים.',
  secs:[
   {t:'המשפחה',fields:[
     {k:'marital',l:'מצב משפחתי',type:'select',req:1,opts:[['married','נשוי/אה'],['single','רווק/ה'],['divorced','גרוש/ה'],['widowed','אלמן/ה']]},
     {k:'city',l:'עיר מגורים'},{k:'address',l:'כתובת מלאה (רשות)',full:1}]},
   {t:'פרטים אישיים',fields:[
     {k:'h_first',l:'שם פרטי',req:1},{k:'h_last',l:'שם משפחה',req:1},
     {k:'h_id',l:'תעודת זהות',req:1,type:'id'},{k:'h_dob',l:'תאריך לידה',type:'date',req:1},
     {k:'h_phone',l:'טלפון נייד',type:'tel',req:1},{k:'h_email',l:'דוא״ל',type:'email'}]},
   {t:'בת הזוג',cond:hasCurrentPartner,fields:[
     {k:'w_first',l:'שם פרטי',req:1},{k:'w_id',l:'תעודת זהות',type:'id',req:1},
     {k:'w_dob',l:'תאריך לידה',type:'date',req:1},{k:'w_phone',l:'טלפון נייד',type:'tel'}]},
   {t:'ילדים',fields:[{k:'children',type:'repeat',l:'ילד',addLabel:'+ הוסף ילד',
     sub:[{k:'name',l:'שם'},{k:'dob',l:'תאריך לידה',type:'date'},{k:'hmo',l:'קופת חולים',type:'select',opts:[['clalit','כללית'],['maccabi','מכבי'],['meuhedet','מאוחדת'],['leumit','לאומית']]}]}],
    hint:'אם אין ילדים — פשוט המשיכו לפרק הבא.'}]},
 {key:'work',title:'עבודה והכנסות',icon:'documents',desc:'המידע כאן מאפשר לנו לבדוק עבורכם החזרי מס, מענק עבודה וזכויות נוספות.',
  secs:[
   {t:'התעסוקה שלך',fields:[
     {k:'h_emp',l:'סטטוס תעסוקה',type:'employment',req:1,opts:[['avrech','אברך'],['emp','שכיר'],['self','עצמאי'],['none','לא עובד'],['other','אחר']]},
     {k:'h_work',l:'מקום עבודה',cond:a=>employed(a,'h','emp')},
     {k:'h_tenure',l:'ותק (שנים)',type:'number',cond:a=>employed(a,'h','emp')},
     {k:'h_gross',l:'שכר ברוטו (₪)',type:'currency',cond:a=>employed(a,'h','emp'),followUp:'לא נמסר — להשלמה מהתלוש עם הנציג'},
     {k:'h_net',l:'שכר נטו (₪)',type:'currency',cond:a=>employed(a,'h','emp')},
     {k:'h_employers',l:'מספר מעסיקים',type:'number',cond:a=>employed(a,'h','emp')},
     {k:'h_job_change',l:'החליף עבודה השנה?',type:'pills',opts:yn,cond:a=>employed(a,'h','emp')},
     {k:'h_biz_type',l:'תחום העסק',cond:a=>employed(a,'h','self')},
     {k:'h_biz_income',l:'הכנסה חודשית ממוצעת (₪)',type:'currency',cond:a=>employed(a,'h','self')},
     {k:'h_biz_years',l:'ותק העסק (שנים)',type:'number',cond:a=>employed(a,'h','self')},
     {k:'h_biz_registration',l:'סוג העוסק הרשום',opts:[['exempt','עוסק פטור'],['licensed','עוסק מורשה'],['company','חברה'],['other','אחר'],['dk','לא יודע']],cond:a=>employed(a,'h','self')},
     {k:'h_work_continuity',l:'האם היו הפסקות עבודה או כמה מקומות עבודה בשש השנים האחרונות?',opts:[...yn,['dk','לא יודע']]},
     {k:'h_stopped',l:'הפסיק לעבוד במהלך השנה האחרונה?',type:'pills',opts:yn,cond:a=>employed(a,'h','none')||employed(a,'h','avrech'),full:1}]},
   {t:'תעסוקה — בת הזוג',cond:hasCurrentPartner,fields:[
     {k:'w_emp',l:'סטטוס תעסוקה',type:'employment',req:1,opts:[['emp','שכירה'],['self','עצמאית'],['none','לא עובדת'],['other','אחר']]},
     {k:'w_work',l:'מקום עבודה',cond:a=>employed(a,'w','emp')},
     {k:'w_gross',l:'שכר ברוטו (₪)',type:'currency',cond:a=>employed(a,'w','emp'),followUp:'לא נמסר — להשלמה מהתלוש עם הנציג'},
     {k:'w_net',l:'שכר נטו (₪)',type:'currency',cond:a=>employed(a,'w','emp')},
     {k:'w_job_change',l:'החליפה עבודה השנה?',type:'pills',opts:yn,cond:a=>employed(a,'w','emp')},
     {k:'w_biz_type',l:'תחום העסק',cond:a=>employed(a,'w','self')},
     {k:'w_biz_income',l:'הכנסה חודשית ממוצעת (₪)',type:'currency',cond:a=>employed(a,'w','self')},
     {k:'w_biz_registration',l:'סוג העוסק הרשום',opts:[['exempt','עוסק פטור'],['licensed','עוסק מורשה'],['company','חברה'],['other','אחר'],['dk','לא יודעת']],cond:a=>employed(a,'w','self')},
     {k:'w_work_continuity',l:'האם היו הפסקות עבודה או כמה מקומות עבודה בשש השנים האחרונות?',opts:[...yn,['dk','לא יודעת']]},
     {k:'w_stopped',l:'הפסיקה לעבוד במהלך השנה האחרונה?',type:'pills',opts:yn,cond:a=>employed(a,'w','none'),full:1}]},
   {t:'הכנסות נוספות',fields:[
     {k:'extra_income',l:'סמנו כל מה שרלוונטי',type:'checks',full:1,opts:[['rent','הכנסה משכירות'],['allowance','קצבאות'],['biz','הכנסה מעסק נוסף'],['other','הכנסות אחרות']]},{k:'extra_income_other',l:'אילו הכנסות נוספות?',cond:a=>(a.extra_income||[]).includes('other')}]}]},
 {key:'housing',title:'מגורים',icon:'documents',desc:'פרטי המגורים וההוצאה על דיור יעזרו לנציג להבין אילו נושאים כדאי לבדוק.',
  secs:[{t:'הדירה שלכם',fields:[
     {k:'housing',l:'סטטוס מגורים',type:'pills',req:1,opts:[['own','בעלות'],['rent','שכירות'],['family','אצל משפחה / אחר']]},
     {k:'prop_value',l:'שווי נכס משוער (₪)',type:'currency',cond:a=>a.housing==='own'},
     {k:'prop_count',l:'מספר נכסים בבעלותכם',type:'number',cond:a=>a.housing==='own'},
     {k:'rent_amount',l:'שכר דירה חודשי (₪)',type:'currency',cond:a=>a.housing==='rent',followUp:'לא נמסר — להשלמה מחוזה השכירות עם הנציג'},
     {k:'rent_aid_now',l:'מקבלים סיוע בשכר דירה?',type:'pills',opts:[...yn,['dk','לא יודעים — נברר עם הנציג']],cond:a=>a.housing==='rent'}]}]},
 {key:'mortgage',title:'משכנתא',icon:'documents',desc:'משכנתא היא הלוואה המובטחת בנכס. מלאו את הפרטים הידועים לכם; את הנתונים המדויקים אפשר להשלים מתוך המסמכים.',cond:a=>a.housing==='own',
  secs:[{t:'פרטי המשכנתא',fields:[
     {k:'has_mortgage',l:'קיימת משכנתא על הנכס?',type:'pills',req:1,opts:yn,full:1},
     {k:'mort_bank',l:'הבנק',type:'select',cond:a=>a.has_mortgage==='yes',opts:[['leumi','לאומי'],['poalim','הפועלים'],['mizrahi','מזרחי טפחות'],['discount','דיסקונט'],['other','אחר']]},
     {k:'mort_balance',l:'יתרה משוערת (₪)',type:'currency',cond:a=>a.has_mortgage==='yes',followUp:'לא נמסר — להשלמה מדוח המשכנתא עם הנציג'},
     {k:'mort_monthly',l:'החזר חודשי (₪)',type:'currency',cond:a=>a.has_mortgage==='yes',followUp:'לא נמסר — להשלמה מדוח המשכנתא עם הנציג'},
     {k:'mort_date',l:'תאריך לקיחה משוער',type:'date',cond:a=>a.has_mortgage==='yes'},
     {k:'mort_refi',l:'בוצע מחזור בעבר?',type:'pills',opts:yn,cond:a=>a.has_mortgage==='yes'},
     {k:'mort_count',l:'מספר משכנתאות',type:'number',cond:a=>a.has_mortgage==='yes'}]}]},
 {key:'savings',title:'חסכונות והשקעות',icon:'documents',desc:'סמנו את מוצרי החיסכון הידועים לכם. לחיצה על סימן השאלה מציגה הסבר קצר; את הפרטים המדויקים נבדוק בהמשך במסמכים ובהרשאה מתאימה.',
  secs:[{t:'מה קיים אצלכם?',fields:[
     {k:'savings',type:'checks',l:'',full:1,opts:[['pension','פנסיה'],['hishtalmut','קרן השתלמות'],['gemel','קופת גמל'],['gemel_inv','גמל להשקעה'],['policy','פוליסת חיסכון'],['portfolio','תיק השקעות'],['deposits','פיקדונות'],['other','חיסכון אחר']]},{k:'savings_knowledge',l:'עד כמה אתם מכירים את החסכונות שלכם?',opts:[['known','סימנו את מה שידוע לנו'],['partial','מכירים רק חלק — נרצה עזרה בהשלמה'],['dk','לא יודעים אילו חסכונות קיימים']]}]}]},
 {key:'insurance',title:'ביטוחים',icon:'documents',desc:'סמנו אילו ביטוחים ידועים לכם. המידע יעזור לבעל המקצוע להבין מה קיים ומה דורש בדיקה.',
  secs:[{t:'אילו ביטוחים קיימים?',fields:[
     {k:'ins',type:'checks',l:'',full:1,opts:[['health','בריאות'],['life','חיים'],['critical','מחלות קשות'],['mort_life','חיים למשכנתא'],['building','מבנה'],['car','רכב']]},
     {k:'has_car',l:'יש רכב בבעלות המשפחה?',type:'pills',opts:yn,req:1},
     {k:'car_cover',l:'איזה ביטוח יש לרכב?',opts:[['mandatory','חובה בלבד'],['third_party','חובה וצד ג׳'],['comprehensive','חובה ומקיף'],['different','כיסוי אחר / שונה בין כלי הרכב'],['dk','לא יודעים']],cond:a=>a.has_car==='yes'}]}]},
 {key:'loans',title:'הלוואות',icon:'documents',desc:'לא כולל משכנתא. אם אין הלוואות — המשיכו הלאה.',
  secs:[{t:'הלוואות פעילות',fields:[{k:'loans',type:'repeat',l:'הלוואה',addLabel:'+ הוסף הלוואה',
     sub:[{k:'lender',l:'גוף מלווה'},{k:'balance',l:'יתרה (₪)',type:'currency'},{k:'monthly',l:'החזר חודשי (₪)',type:'currency'},{k:'rate',l:'ריבית (אם ידועה)'},{k:'end',l:'תאריך סיום',type:'date'}]}]}]},
 {key:'rights',title:'זכויות והטבות',icon:'documents',desc:'סמנו נושאים שתרצו לבדוק עם הנציג. התשובות עוזרות להכין את הבירור ואינן קובעות זכאות או מבטיחות החזר.',
  secs:[{t:'בדיקת זכאות',fields:[
     {k:'tax_filed',l:'הגשתם בקשה להחזר מס ב-6 השנים האחרונות?',type:'pills',opts:[...yn,['dk','לא יודעים']],full:1},
     {k:'kids_arnona',l:'קיימת הנחה בארנונה כיום?',type:'pills',opts:[...yn,['dk','לא יודעים']],full:1},
     {k:'btl_allowances',l:'מקבלים קצבאות מביטוח לאומי?',type:'checks',full:1,opts:[['kids','קצבת ילדים'],['disability','נכות'],['income','הבטחת הכנסה'],['none','לא מקבלים']]},
     {k:'ravkav_profile',l:'סטטוס שיכול לזכות בהנחה ברב־קו (סטודנט, אזרח ותיק, נכות...)',type:'pills',opts:yn,full:1},
     {k:'water_persons',l:'מספר הנפשות המעודכן בחשבון המים תואם למשפחה?',type:'pills',opts:[...yn,['dk','לא יודעים']],full:1}]},
   {t:'נושאים לבדיקת מס — רשות',optional:true,hint:'אפשר לסמן ״לא יודעים״ ולהשלים עם בעל מקצוע. אין צורך לחשב כאן זכאות.',fields:[
     {k:'tax_withheld_withdrawal',l:'נוכה מס במשיכת חיסכון, פיצויים או תגמולים בשש השנים האחרונות?',opts:[...yn,['dk','לא יודעים']]},
     {k:'tax_withheld_securities',l:'נוכה מס מפעילות בניירות ערך בשש השנים האחרונות?',opts:[...yn,['dk','לא יודעים']]},
     {k:'property_tax_paid',l:'שולם מס שבח בעת מכירת נכס?',opts:[...yn,['dk','לא יודעים']]},
     {k:'tax_locality_review',l:'תרצו לבדוק אם מקום המגורים רלוונטי להטבת מס?',opts:[...yn,['dk','לא יודעים']]}
   ]},
   {t:'בירורים אישיים — רשות',optional:true,hint:'אפשר לבקש שיחה עם הנציג בלי לפרט כאן אבחנות או לצרף מידע רפואי.',fields:[
     {k:'rights_review',l:'על אילו נושאים תרצו לדבר עם הנציג?',type:'checks',opts:[['disability','קצבת נכות ותפקוד בעבודה'],['child','סיוע לילד שזקוק להשגחה או לתמיכה'],['injury','זכויות בעקבות תאונה או פגיעה']]},
     {k:'disability_function',l:'קיים קושי בתפקוד או בעבודה שתרצו לבדוק?',opts:[...yn,['private','מעדיפים לדבר עם הנציג']],cond:a=>(a.rights_review||[]).includes('disability')},
     {k:'disability_income',l:'הכנסה חודשית מעבודה לפני ניכויים, אם ידועה (₪)',type:'currency',cond:a=>(a.rights_review||[]).includes('disability')},
     {k:'disability_documents',l:'יש תיעוד רפואי קיים שאפשר לברר לגביו בשיחה?',opts:[...yn,['dk','לא יודעים'],['private','מעדיפים לדבר עם הנציג']],cond:a=>(a.rights_review||[]).includes('disability')}
   ]}]},
 {key:'banks',title:'בנקים ואשראי',icon:'documents',desc:'נכיר את החשבונות, הכרטיסים והעמלות כדי למפות נושאים לבדיקה. אין צורך למסור סיסמה או פרטי כרטיס אשראי.',
  secs:[{t:'חשבונות ועמלות',fields:[
     {k:'bank_count',l:'מספר חשבונות בנק',type:'number',req:1},
     {k:'banks',l:'באילו בנקים?',type:'checks',opts:[['leumi','לאומי'],['poalim','הפועלים'],['mizrahi','מזרחי'],['discount','דיסקונט'],['pagi','פאג״י'],['other','אחר']],full:1},
     {k:'cc_count',l:'מספר כרטיסי אשראי',type:'number'},
     {k:'monthly_fees',l:'עמלות חודשיות משוערות (₪)',type:'currency'},
     {k:'credit_frame',l:'קיימת מסגרת אשראי מנוצלת?',type:'pills',opts:yn},
     {k:'bank_fee_plan',l:'באיזה מסלול עמלות אתם נמצאים?',opts:[['basic','בסיסי'],['extended','מורחב'],['other','אחר / הטבה אישית'],['none','ללא מסלול'],['dk','לא יודעים']]}]},
   {t:'כסף בגמ״חים — רשות',optional:true,fields:[
     {k:'gemach_money',l:'יש כסף שהפקדתם או הלוואה שלקחתם בגמ״ח?',opts:[...yn,['dk','לא יודעים']]},
     {k:'gemach_kind',l:'באיזה סוג קשר כספי מדובר?',opts:[['deposit','כסף שהפקדנו'],['loan','הלוואה שקיבלנו'],['both','גם הפקדה וגם הלוואה']],cond:a=>a.gemach_money==='yes'},
     {k:'gemach_amount',l:'סכום שהפקדתם בגמ״ח (₪), אם ידוע',type:'currency',cond:a=>a.gemach_money==='yes'&&['deposit','both'].includes(a.gemach_kind)},
     {k:'gemach_terms',l:'שם הגמ״ח ותנאים שחשוב לברר',cond:a=>a.gemach_money==='yes'}],hint:'הלוואה מהגמ״ח אפשר לפרט בפרק הלוואות; אין צורך לספור אותה שוב כהפקדה.'},
   {t:'טלפונים ותקשורת — רשות',optional:true,fields:[
     {k:'communication_monthly',l:'תשלום חודשי כולל לטלפונים ולאינטרנט (₪)',type:'currency'},
     {k:'communication_reviewed',l:'בדקתם את החבילות והמחירים בשנה האחרונה?',opts:[...yn,['dk','לא יודעים']]}
   ]}]},
 {key:'weddings',title:'חתונות הילדים',icon:'documents',desc:'כאן מתכננים כמה תרצו להכין לחתונת כל ילד ומתי. אלה יעדים משוערים לתכנון, ולא התחייבות להפקיד סכום מסוים. אם עדיין לא החלטתם, אפשר להשאיר ריק.',cond:a=>(a.children||[]).length>0,
  secs:[{t:'יעדים לכל ילד',dyn:'perChild'},
   {t:'יכולת החיסכון של המשפחה',fields:[
     {k:'wed_monthly',l:'חיסכון חודשי אפשרי למטרה (₪)',type:'currency'},
     {k:'wed_lump',l:'סכום חד־פעמי קיים (₪)',type:'currency'}]}]},
];
