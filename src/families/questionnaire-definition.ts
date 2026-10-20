// Maintained questionnaire; preserve stored answer keys when editing.
import {employed} from "../lib/employment";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Answers=Record<string, any>;
export interface LegacyField { k:string;l?:string;type?:string;req?:number;followUp?:string;full?:number;opts?:string[][];cond?:(a:Answers)=>boolean;sub?:LegacyField[];addLabel?:string;exclusive?:string[]; }
export interface Chapter { key:string;title:string;icon:string;desc:string;cond?:(a:Answers)=>boolean;secs:{t:string;cond?:(a:Answers)=>boolean;fields?:LegacyField[];hint?:string;dyn?:string;optional?:boolean}[]; }
export const hasCurrentPartner=(a:Answers)=>a.marital==='married';
export const hasOwnedProperty=(a:Answers)=>a.housing==='own'||a.owns_property==='yes';
const yn=[['yes','כן'],['no','לא'],['dk','לא יודעים']];
const mortgageBanks=[['leumi','לאומי'],['poalim','הפועלים'],['mizrahi','מזרחי טפחות'],['discount','דיסקונט'],['other','אחר']];
export const CHAPTERS: Chapter[]=[
 {key:'family',title:'פרטי משפחה',icon:'documents',desc:'נתחיל בהיכרות בסיסית — ההרכב המשפחתי, הפרטים האישיים והילדים.',
  secs:[
   {t:'המשפחה',fields:[
     {k:'marital',l:'מצב משפחתי',type:'select',req:1,opts:[['married','נשוי/אה'],['single','רווק/ה'],['divorced','גרוש/ה'],['widowed','אלמן/ה']]},
     {k:'city',l:'עיר מגורים'},{k:'address',l:'כתובת מלאה',full:1}]},
   {t:'פרטים אישיים',fields:[
     {k:'h_first',l:'שם פרטי',req:1},{k:'h_last',l:'שם משפחה',req:1},
     {k:'h_id',l:'מספר תעודת זהות',req:1,type:'id'},{k:'h_dob',l:'תאריך לידה',type:'date',req:1},
     {k:'h_phone',l:'טלפון נייד',type:'tel',req:1},{k:'h_email',l:'דוא״ל',type:'email'}]},
   {t:'בן/בת הזוג',cond:hasCurrentPartner,fields:[
     {k:'w_first',l:'שם פרטי',req:1},{k:'w_id',l:'מספר תעודת זהות',type:'id',req:1},
     {k:'w_dob',l:'תאריך לידה',type:'date',req:1},{k:'w_phone',l:'טלפון נייד',type:'tel'}]},
   {t:'ילדים',fields:[{k:'children',type:'repeat',l:'ילד',addLabel:'הוספת ילד',
     sub:[{k:'name',l:'שם'},{k:'dob',l:'תאריך לידה',type:'date'},{k:'hmo',l:'קופת חולים',type:'select',opts:[['clalit','כללית'],['maccabi','מכבי'],['meuhedet','מאוחדת'],['leumit','לאומית']]}]}],
    hint:'אם אין ילדים — פשוט המשיכו לפרק הבא.'}]},
 {key:'work',title:'עבודה והכנסות',icon:'documents',desc:'המידע כאן מאפשר לנו לבדוק עבורכם החזרי מס, מענק עבודה וזכויות נוספות.',
  secs:[
   {t:'העבודה שלך',fields:[
     {k:'h_emp',l:'העיסוקים כיום',type:'employment',req:1,opts:[['avrech','אברך'],['emp','שכיר'],['self','עצמאי'],['none','לא עובד'],['other','אחר']]},
     {k:'h_work',l:'מקום עבודה',cond:a=>employed(a,'h','emp')},
     {k:'h_tenure',l:'ותק (שנים)',type:'number',cond:a=>employed(a,'h','emp')},
     {k:'h_gross',l:'שכר חודשי ברוטו (₪)',type:'currency',cond:a=>employed(a,'h','emp'),followUp:'לא נמסר — להשלמה מהתלוש עם הנציג'},
     {k:'h_net',l:'שכר חודשי נטו (₪)',type:'currency',cond:a=>employed(a,'h','emp')},
     {k:'h_employers',l:'מספר מעסיקים',type:'number',cond:a=>employed(a,'h','emp')},
     {k:'h_job_change',l:'החלפת מקום עבודה השנה?',type:'pills',opts:yn,cond:a=>employed(a,'h','emp')},
     {k:'h_biz_type',l:'תחום העסק',cond:a=>employed(a,'h','self')},
     {k:'h_biz_income',l:'רווח חודשי ממוצע לפני מסים (₪)',type:'currency',followUp:'לא נמסר — לברר רווח לפני מסים עם הנציג',cond:a=>employed(a,'h','self')},
     {k:'h_biz_years',l:'ותק העסק (שנים)',type:'number',cond:a=>employed(a,'h','self')},
     {k:'h_biz_registration',l:'סוג העוסק הרשום',opts:[['exempt','עוסק פטור'],['licensed','עוסק מורשה'],['company','חברה'],['other','אחר'],['dk','לא יודע']],cond:a=>employed(a,'h','self')},
     {k:'h_work_continuity',l:'האם היו הפסקות עבודה או כמה מקומות עבודה בשש השנים האחרונות?',opts:yn},
     {k:'h_stopped',l:'האם הפסקת לעבוד ב־12 החודשים האחרונים?',type:'pills',opts:yn,cond:a=>employed(a,'h','none')||employed(a,'h','avrech'),full:1}]},
   {t:'תעסוקה — בן/בת הזוג',cond:hasCurrentPartner,fields:[
     {k:'w_emp',l:'העיסוקים כיום',type:'employment',req:1,opts:[['emp','שכיר/ה'],['self','עצמאי/ת'],['none','לא עובד/ת'],['other','אחר']]},
     {k:'w_work',l:'מקום עבודה',cond:a=>employed(a,'w','emp')},
     {k:'w_gross',l:'שכר חודשי ברוטו (₪)',type:'currency',cond:a=>employed(a,'w','emp'),followUp:'לא נמסר — להשלמה מהתלוש עם הנציג'},
     {k:'w_net',l:'שכר חודשי נטו (₪)',type:'currency',cond:a=>employed(a,'w','emp')},
     {k:'w_job_change',l:'האם היה שינוי במקום העבודה של בן/בת הזוג השנה?',type:'pills',opts:yn,cond:a=>employed(a,'w','emp')},
     {k:'w_biz_type',l:'תחום העסק',cond:a=>employed(a,'w','self')},
     {k:'w_biz_income',l:'רווח חודשי ממוצע לפני מסים (₪)',type:'currency',followUp:'לא נמסר — לברר רווח לפני מסים עם הנציג',cond:a=>employed(a,'w','self')},
     {k:'w_biz_registration',l:'סוג העוסק הרשום',opts:[['exempt','עוסק פטור'],['licensed','עוסק מורשה'],['company','חברה'],['other','אחר'],['dk','לא יודעים']],cond:a=>employed(a,'w','self')},
     {k:'w_work_continuity',l:'האם היו הפסקות עבודה או כמה מקומות עבודה בשש השנים האחרונות?',opts:yn},
     {k:'w_stopped',l:'האם בן/בת הזוג הפסיק/ה לעבוד ב־12 החודשים האחרונים?',type:'pills',opts:yn,cond:a=>employed(a,'w','none'),full:1}]},
   {t:'הכנסות נוספות',fields:[
     {k:'extra_income',l:'סמנו כל מה שרלוונטי',type:'checks',full:1,opts:[['rent','הכנסה משכירות'],['allowance','קצבאות'],['biz','הכנסה מעסק נוסף'],['other','הכנסות אחרות']]},{k:'extra_income_other',l:'אילו הכנסות נוספות?',cond:a=>(a.extra_income||[]).includes('other')}]}]},
 {key:'housing',title:'מגורים',icon:'documents',desc:'פרטי המגורים וההוצאה על דיור יעזרו לנציג להבין אילו נושאים כדאי לבדוק.',
  secs:[{t:'הדירה שלכם',fields:[
     {k:'housing',l:'באיזה סידור מגורים אתם גרים כיום?',type:'pills',req:1,opts:[['own','בדירה בבעלותנו'],['rent','בשכירות'],['family','אצל משפחה או בסידור אחר']]},
     {k:'owns_property',l:'יש נכס בבעלותכם, גם אם אינכם גרים בו?',opts:yn,cond:a=>a.housing==='rent'||a.housing==='family'},
     {k:'property_name',l:'תיאור הנכס הראשון או מיקומו',cond:hasOwnedProperty},
     {k:'prop_value',l:'שווי נכס משוער (₪)',type:'currency',cond:hasOwnedProperty},
     {k:'prop_count',l:'מספר נכסים שדווח בעבר — אפשר לעדכן',type:'number',cond:a=>hasOwnedProperty(a)&&a.prop_count!=null},
     {k:'properties',l:'נכס נוסף',type:'repeat',addLabel:'הוספת נכס נוסף',cond:hasOwnedProperty,sub:[{k:'property_name',l:'תיאור הנכס או מיקומו'},{k:'prop_value',l:'שווי הנכס בקירוב (₪)',type:'currency'},{k:'property_use',l:'איך הנכס משמש אתכם?',opts:[['home','מגורים'],['rented','מושכר לאחרים'],['other','אחר'],['dk','לא יודעים']]}]},
     {k:'rent_amount',l:'שכר דירה חודשי (₪)',type:'currency',cond:a=>a.housing==='rent',followUp:'לא נמסר — להשלמה מחוזה השכירות עם הנציג'},
     {k:'rent_aid_now',l:'מקבלים סיוע בשכר דירה?',type:'pills',opts:yn,cond:a=>a.housing==='rent'}]}]},
 {key:'mortgage',title:'משכנתא',icon:'documents',desc:'מפרטים כל משכנתא בנפרד, גם על נכס שאינכם גרים בו. סכומים ומועדים יכולים להיות משוערים.',cond:hasOwnedProperty,
  secs:[{t:'פרטי המשכנתא',fields:[
     {k:'has_mortgage',l:'יש משכנתא על אחד הנכסים?',type:'pills',req:1,opts:yn,full:1},
     {k:'mort_property',l:'לאיזה נכס שייכת המשכנתא הראשונה?',cond:a=>a.has_mortgage==='yes'},
     {k:'mort_bank',l:'הבנק',type:'select',cond:a=>a.has_mortgage==='yes',opts:[['leumi','לאומי'],['poalim','הפועלים'],['mizrahi','מזרחי טפחות'],['discount','דיסקונט'],['other','אחר']]},
     {k:'mort_balance',l:'כמה נשאר לשלם על המשכנתא? (₪, בקירוב)',type:'currency',cond:a=>a.has_mortgage==='yes',followUp:'לא נמסר — להשלמה מדוח המשכנתא עם הנציג'},
     {k:'mort_monthly',l:'החזר חודשי (₪)',type:'currency',cond:a=>a.has_mortgage==='yes',followUp:'לא נמסר — להשלמה מדוח המשכנתא עם הנציג'},
     {k:'mort_date',l:'מועד לקיחה משוער — שנה או חודש ושנה',type:'approx-date',cond:a=>a.has_mortgage==='yes'},
     {k:'mort_refi',l:'האם נעשה מיחזור למשכנתא?',type:'pills',opts:yn,cond:a=>a.has_mortgage==='yes'},
     {k:'mort_count',l:'מספר משכנתאות שדווח בעבר — אפשר לעדכן',type:'number',cond:a=>a.has_mortgage==='yes'&&a.mort_count!=null},
     {k:'mortgages',l:'משכנתא נוספת',type:'repeat',addLabel:'הוספת משכנתא נוספת',cond:a=>a.has_mortgage==='yes',sub:[{k:'mort_property',l:'לאיזה נכס שייכת המשכנתא?'},{k:'mort_bank',l:'הבנק',opts:mortgageBanks},{k:'mort_balance',l:'יתרת המשכנתא בקירוב (₪)',type:'currency'},{k:'mort_monthly',l:'החזר חודשי (₪)',type:'currency'},{k:'mort_date',l:'מועד לקיחה משוער — שנה או חודש ושנה',type:'approx-date'},{k:'mort_refi',l:'בוצע מיחזור?',opts:yn}]}]}]},
 {key:'savings',title:'חסכונות והשקעות',icon:'documents',desc:'סמנו את מוצרי החיסכון הידועים לכם. לחיצה על סימן השאלה מציגה הסבר קצר; את הפרטים המדויקים נבדוק בהמשך במסמכים ובהרשאה מתאימה.',
  secs:[{t:'אילו חסכונות והשקעות יש לכם?',fields:[
     {k:'savings',type:'checks',l:'',full:1,opts:[['pension','פנסיה'],['hishtalmut','קרן השתלמות'],['gemel','קופת גמל'],['gemel_inv','קופת גמל להשקעה'],['policy','פוליסת חיסכון'],['portfolio','תיק השקעות'],['deposits','פיקדונות'],['other','חיסכון אחר'],['none','אין חסכונות'],['dk','לא יודעים']],exclusive:['none','dk']},{k:'savings_knowledge',l:'עד כמה תמונת החסכונות שלכם ידועה?',opts:[['known','סימנו את מה שידוע לנו'],['partial','מכירים רק חלק — נרצה עזרה בהשלמה'],['dk','לא יודעים אילו חסכונות קיימים']]},{k:'savings_goals',l:'מה תרצו לבדוק ולשפר בחסכונות?',type:'checks',opts:[['fees','דמי ניהול'],['coverage','התאמה לצרכים ולמטרות'],['track','מסלולי החיסכון'],['overview','סדר ותמונה מלאה'],['dk','לא יודעים — נברר בשיחה']],exclusive:['dk']}]}]},
 {key:'insurance',title:'ביטוחים',icon:'documents',desc:'סמנו אילו ביטוחים ידועים לכם. המידע יעזור לבעל המקצוע להבין מה קיים ומה דורש בדיקה.',
  secs:[{t:'אילו ביטוחים קיימים?',fields:[
     {k:'ins',type:'checks',l:'',full:1,opts:[['health','ביטוח בריאות פרטי'],['life','ביטוח חיים'],['critical','מחלות קשות'],['mort_life','חיים למשכנתא'],['building','ביטוח מבנה דירה'],['car','רכב'],['none','אין ביטוחים'],['dk','לא יודעים']],exclusive:['none','dk']},
     {k:'has_car',l:'יש רכב בבעלות המשפחה?',type:'pills',opts:yn,req:1},
     {k:'car_cover',l:'איזה ביטוח יש לרכב?',opts:[['mandatory','חובה בלבד'],['third_party','חובה וצד ג׳'],['comprehensive','חובה ומקיף'],['different','כיסוי אחר / שונה בין כלי הרכב'],['dk','לא יודעים']],cond:a=>a.has_car==='yes'}]}]},
 {key:'loans',title:'הלוואות',icon:'documents',desc:'לא כולל משכנתא. אם אין הלוואות — המשיכו הלאה.',
  secs:[{t:'הלוואות פעילות',hint:'אם אין הלוואות, אפשר להמשיך לפרק הבא בלי להוסיף שורה.',fields:[{k:'loans',type:'repeat',l:'הלוואה',addLabel:'הוספת הלוואה',
     sub:[{k:'lender',l:'ממי נלקחה ההלוואה?'},{k:'balance',l:'הסכום שנותר להחזר (₪)',type:'currency'},{k:'monthly',l:'החזר חודשי (₪)',type:'currency'},{k:'rate',l:'הריבית לפי ההסכם, אם ידועה'},{k:'end',l:'מועד ההחזר האחרון',type:'date'}]}]}]},
 {key:'rights',title:'זכויות והטבות',icon:'documents',desc:'סמנו נושאים שתרצו לבדוק עם הנציג. התשובות עוזרות להכין את הבירור ואינן קובעות זכאות או מבטיחות החזר.',
  secs:[{t:'מידע לקראת בירור זכויות',fields:[
     {k:'tax_filed',l:'הגשתם בקשה להחזר מס ב-6 השנים האחרונות?',type:'pills',opts:yn,full:1},
     {k:'kids_arnona',l:'האם אתם מקבלים כיום הנחה בארנונה?',type:'pills',opts:yn,full:1},
     {k:'btl_allowances',l:'מקבלים קצבאות מביטוח לאומי?',type:'checks',full:1,opts:[['kids','קצבת ילדים'],['disability','נכות'],['income','הבטחת הכנסה'],['other','קצבה אחרת'],['none','לא מקבלים'],['dk','לא יודעים']],exclusive:['none','dk']},
     {k:'btl_allowances_other',l:'איזו קצבה נוספת אתם מקבלים?',cond:a=>(a.btl_allowances||[]).includes('other')},
     {k:'ravkav_profile',l:'סטטוס שעשוי להקנות הנחה — תשובה קודמת',type:'pills',opts:yn,cond:a=>a.ravkav_profile!=null},
     {k:'ravkav_discount',l:'יש לכם כיום פרופיל הנחה פעיל ברב־קו?',opts:yn},
     {k:'ravkav_review',l:'תרצו שנבדוק אפשרות להנחה ברב־קו?',opts:yn},
     {k:'water_persons',l:'האם מספר הנפשות בחשבון המים תואם למספר המתגוררים בבית?',type:'pills',opts:yn,full:1}]},
   {t:'נושאים לבדיקת מס — רשות',optional:true,hint:'אפשר לסמן ״לא יודעים״ ולהשלים עם בעל מקצוע. אין צורך לחשב כאן זכאות.',fields:[
     {k:'tax_withheld_withdrawal',l:'נוכה מס במשיכת חיסכון, פיצויים או תגמולים בשש השנים האחרונות?',opts:yn},
     {k:'tax_withheld_securities',l:'נוכה מס מפעילות בניירות ערך בשש השנים האחרונות?',opts:yn},
     {k:'property_tax_paid',l:'שולם מס שבח בעת מכירת נכס?',opts:yn},
     {k:'tax_locality_review',l:'תרצו לבדוק אם מקום המגורים רלוונטי להטבת מס?',opts:yn}
   ]},
   {t:'בירורים אישיים — רשות',optional:true,hint:'אפשר לבקש שיחה עם הנציג בלי לפרט כאן אבחנות או לצרף מידע רפואי.',fields:[
     {k:'rights_review',l:'על אילו נושאים תרצו לדבר עם הנציג?',type:'checks',opts:[['disability','קצבת נכות ותפקוד בעבודה'],['child','סיוע לילד שזקוק להשגחה או לתמיכה'],['injury','זכויות בעקבות תאונה או פגיעה']]},
     {k:'disability_function',l:'קיים קושי בתפקוד או בעבודה שתרצו לבדוק?',opts:[...yn,['private','מעדיפים לדבר עם הנציג']],cond:a=>(a.rights_review||[]).includes('disability')},
     {k:'disability_income',l:'הכנסה חודשית מעבודה לפני ניכויים, אם ידועה (₪)',type:'currency',cond:a=>(a.rights_review||[]).includes('disability')},
     {k:'disability_documents',l:'יש תיעוד רפואי קיים שאפשר לברר לגביו בשיחה?',opts:[...yn,['dk','לא יודעים'],['private','מעדיפים לדבר עם הנציג']],cond:a=>(a.rights_review||[]).includes('disability')}
   ]}]},
 {key:'banks',title:'בנקים ואשראי',icon:'documents',desc:'נכיר את החשבונות, הכרטיסים והעמלות כדי למפות נושאים לבדיקה. אין צורך למסור סיסמה או פרטי כרטיס אשראי.',
  secs:[{t:'חשבונות ועמלות',fields:[
     {k:'bank_count',l:'כמה חשבונות בנק פעילים יש למשפחה?',type:'number',req:1},
     {k:'banks',l:'באילו בנקים?',type:'checks',opts:[['leumi','לאומי'],['poalim','הפועלים'],['mizrahi','מזרחי טפחות'],['discount','דיסקונט'],['pagi','פאג״י'],['other','אחר']],full:1},
     {k:'cc_count',l:'מספר כרטיסי אשראי',type:'number'},
     {k:'monthly_fees',l:'עמלות בנק ודמי כרטיס בחודש (₪, בקירוב)',type:'currency'},
     {k:'credit_frame',l:'משתמשים במסגרת האשראי המאושרת בחשבון?',type:'pills',opts:yn},
     {k:'overdraft',l:'החשבון במינוס, כולל חריגה מהמסגרת?',opts:yn},
     {k:'overdraft_amount',l:'סך המינוס בפועל (₪, בקירוב)',type:'currency',cond:a=>a.overdraft==='yes'},
     {k:'credit_used',l:'מתוכו: הסכום המנוצל במסגרת המאושרת (₪)',type:'currency',cond:a=>a.credit_frame==='yes'},
     {k:'bank_fee_plan',l:'באיזה מסלול עמלות אתם נמצאים?',opts:[['basic','בסיסי'],['extended','מורחב'],['other','אחר / הטבה אישית'],['none','ללא מסלול'],['dk','לא יודעים']]}]},
   {t:'כסף בגמ״חים — רשות',optional:true,fields:[
     {k:'gemach_money',l:'יש כסף שהפקדתם או הלוואה שלקחתם בגמ״ח?',opts:yn},
     {k:'gemach_kind',l:'הפקדתם כסף בגמ״ח, לקחתם ממנו הלוואה, או שניהם?',opts:[['deposit','כסף שהפקדנו'],['loan','הלוואה שקיבלנו'],['both','גם הפקדה וגם הלוואה']],cond:a=>a.gemach_money==='yes'},
     {k:'gemach_amount',l:'סכום שהפקדתם בגמ״ח (₪), אם ידוע',type:'currency',cond:a=>a.gemach_money==='yes'&&['deposit','both'].includes(a.gemach_kind)},
     {k:'gemach_terms',l:'שם הגמ״ח ותנאים שחשוב לברר',cond:a=>a.gemach_money==='yes'}],hint:'הלוואה מהגמ״ח אפשר לפרט בפרק הלוואות; אין צורך לספור אותה שוב כהפקדה.'},
   {t:'עוד הוצאה חודשית: טלפון ואינטרנט — רשות',optional:true,fields:[
     {k:'communication_monthly',l:'תשלום חודשי כולל לטלפונים ולאינטרנט (₪)',type:'currency'},
     {k:'communication_reviewed',l:'בדקתם את החבילות והמחירים בשנה האחרונה?',opts:yn}
   ]}]},
 {key:'weddings',title:'חתונות הילדים',icon:'documents',desc:'כאן מתכננים כמה תרצו להכין לחתונת כל ילד ומתי. אלה יעדים משוערים לתכנון, ולא התחייבות להפקיד סכום מסוים. אם עדיין לא החלטתם, אפשר להשאיר ריק.',cond:a=>(a.children||[]).length>0,
  secs:[{t:'יעדים לכל ילד',dyn:'perChild'},
   {t:'יכולת החיסכון של המשפחה',fields:[
     {k:'wed_monthly',l:'כמה תוכלו לחסוך בכל חודש לחתונות הילדים? (₪)',type:'currency'},
     {k:'wed_lump',l:'כמה כסף כבר מיועד לחתונות הילדים? (₪)',type:'currency'}]}]},
];
