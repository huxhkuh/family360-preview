import type {ReportContent} from './report-data';
import type {Comparison} from '../meetings/comparison';
export const exampleAnswers={marital:'married',city:'עיר לדוגמה',address:'רחוב לדוגמה 1',h_first:'ישראל',h_last:'לדוגמה',h_id:'000000018',h_dob:'1985-01-01',h_phone:'0500000000',h_email:'demo@example.invalid',w_first:'שרה',w_id:'000000026',w_dob:'1987-01-01',w_phone:'0500000000',children:[{name:'ילד לדוגמה',dob:'2007-01-01',hmo:'clalit'},{name:'ילדה לדוגמה',dob:'2012-01-01',hmo:'maccabi'}],h_emp:['emp'],h_work:'מעסיק מדומה',h_tenure:8,h_gross:14000,h_net:11000,h_employers:1,h_job_change:'no',h_work_continuity:'no',w_emp:['emp'],w_work:'מעסיק נוסף לדוגמה',w_gross:9000,w_net:7500,w_job_change:'no',w_work_continuity:'dk',extra_income:['allowance'],housing:'own',property_name:'דירת המגורים — דוגמה',prop_value:1800000,has_mortgage:'yes',mort_bank:'leumi',mort_balance:650000,mort_monthly:4200,mort_date:'2018',mort_refi:'no',savings:['pension','hishtalmut'],savings_knowledge:'partial',savings_goals:['overview','fees'],ins:['health','life','car'],has_car:'yes',car_cover:'comprehensive',loans:[{lender:'בנק לדוגמה',balance:45000,monthly:1100,rate:'5.8% לפי דיווח מדומה',end:'2030-01-01'}],tax_filed:'no',kids_arnona:'no',btl_allowances:['kids'],ravkav_discount:'dk',ravkav_review:'yes',rights_review:[],bank_count:1,banks:['leumi'],cc_count:2,monthly_fees:85,credit_frame:'yes',credit_used:2000,overdraft:'yes',overdraft_amount:2000,bank_fee_plan:'none',gemach_money:'no',communication_monthly:220,communication_reviewed:'no',wt_0:100000,wa_0:23,wt_1:100000,wa_1:22,wed_monthly:1500,wed_lump:30000};
// Entirely fictional fixtures. No document was uploaded or checked with a bank.
export const exampleComparison:Comparison={kind:'expense',period:'monthly',status:'quote',current:85,proposed:25,setup_cost:0,current_detail:'בדוגמה המשפחה משלמת 85 ₪ לחודש בעמלות.',proposed_detail:'הצעה מדומה למסלול ב־25 ₪ לחודש, בכפוף לתנאים.',basis:'השוואת עמלות חודשיות לאותו חשבון ואותו היקף שירות.',conditions:'בדוגמה מסלול 25 ₪ מותנה בתנאי שימוש. המשפחה בחרה לבסוף במסלול אחר שעלותו 30 ₪.',current_source:'מסמך הדגמה א׳: חיוב ישן של 85 ₪. אין מסמך בנק אמיתי.',proposed_source:'הצעה מדומה ב׳: מסלול 25 ₪. אין הצעת בנק אמיתית.',checked_on:'2026-10-10',valid_until:'2026-10-31'};
export const exampleReportContent:ReportContent={context:'המשפחה ביקשה להפחית את העמלות הקבועות ולהבין מה משתנה בחיוב החודשי.',outcome:'בדוגמה בוצע מעבר ממסלול של 85 ₪ למסלול של 30 ₪ לחודש. בעל המקצוע דיווח על השינוי, והנציג הזין את העלות המעודכנת לאחר בדיקת אישור הדגמה. נוסף לכך תועד זיכוי חד־פעמי של 120 ₪. ההצעה המקורית ל־25 ₪ לא מומשה, ולכן אינה מוצגת כחיסכון שהושג.',recommendations:'לעבור על החיוב הבא ולוודא שהוא תואם למסלול שנבחר. לשמור את אישור השינוי והזיכוי. אפשרות למסלול של 25 ₪ תיבדק רק אם תנאיה יתאימו בעתיד; היא אינה משימת ביצוע פתוחה בתהליך שהסתיים.',no_savings_reason:'',chapter_reviews:[
 {key:'family',status:'conversation',note:'פרטי הדוגמה והרכב המשפחה עברו בירור בשיחה מדומה; אין אימות מול מרשם.'},
 {key:'work',status:'conversation',note:'נרשמו שתי הכנסות מעבודה. רצף העבודה של בת הזוג אינו ידוע. לא בוצעה בדיקת החזרי מס.'},
 {key:'housing',status:'conversation',note:'דווח על דירה בבעלות המשפחה. השווי הוא הערכת הלקוח, ללא שמאות.'},
 {key:'mortgage',status:'not_reviewed',note:'נרשמו יתרה והחזר לפי הלקוח. לא נבדקו מסלולים, ריביות או כדאיות מיחזור.'},
 {key:'savings',status:'not_reviewed',note:'הלקוח מכיר רק חלק מהמוצרים. אין בדוח זה בדיקת מסלקה או אישור דמי ניהול.'},
 {key:'insurance',status:'not_reviewed',note:'נמסרו סוגי ביטוחים בלבד. לא נבדקו פוליסות, כפל או התאמת כיסוי.'},
 {key:'loans',status:'conversation',note:'נרשמה הלוואה אחת לפי דיווח הלקוח. אין מסקנה מקצועית לגבי הריבית או איחוד הלוואות.'},
 {key:'rights',status:'not_reviewed',note:'נרשמו תשובות לגבי מס, ארנונה וקצבאות. לא נקבעה זכאות להטבה או להחזר.'},
 {key:'banks',status:'partial',note:'תועדה בדיקה מקצועית וביצוע בעמלות בלבד. המינוס, מסגרת האשראי והוצאות התקשורת לא נבדקו מקצועית.'},
 {key:'weddings',status:'conversation',note:'נרשמו יעדים לשני ילדים ויכולת חיסכון לפי הלקוח. אלה יעדי תכנון, ולא חיסכון שהושג או המלצת השקעה.'}
 ],facts:[
 {id:'example-bank-realized',description:'הפחתת עמלות בחשבון הבנק',source:'מסמך הדגמה א׳: 85 ₪ לפני השינוי; אישור הדגמה ג׳: חיוב חדש 30 ₪. הוזן ואושר בידי הנציג.',confirmed:true,result:'realized',kind:'recurring',period:'month',before_agorot:8500,after_agorot:3000},
 {id:'example-refund',description:'זיכוי חד־פעמי על עמלות',source:'אישור זיכוי מדומה ד׳ בסך 120 ₪, שנבדק לצורך ההדגמה בלבד.',confirmed:true,result:'realized',kind:'one_off',amount_agorot:12000},
 {id:'example-optional',description:'אפשרות עתידית למסלול נוסף — לא בוצעה',source:'הצעה מדומה ב׳: 25 ₪ לעומת המסלול שנבחר בפועל, 30 ₪. מותנה בהתאמת התנאים בעתיד.',confirmed:true,result:'potential',kind:'recurring',period:'month',before_agorot:3000,after_agorot:2500},
]};
export const exampleSourceMap=[
 ['שם המשפחה ומספר התיק','משפחת לדוגמה · F-2026-001','פרטי תיק הדמו; שם הדוגמה נקבע בטעינת התרחיש. במערכת רגילה יש לאמת מול פרטי הלקוח.'],
 ['תאריך, מספר גרסה ושם המאשר','מופיעים בכותרת ובסוף הדוח','המערכת קובעת אותם בעת אישור הדוח; לא נגזרים מהשאלון.'],
 ['מה היה חשוב למשפחה','הפחתת עמלות והבנת החיוב','הנציג מזין בעקבות השיחה. הטקסט אינו מוסק אוטומטית מתשובות השאלון.'],
 ['העלות המקורית','85 ₪ לחודש','בעל המקצוע מזין בניתוח לפי מסמך הדגמה א׳; הנציג מזין אותה שוב בשורת הדוח הסופי.'],
 ['החלופה שהוצעה לפני הפגישה','25 ₪ לחודש; פוטנציאל 60 ₪ לחודש ו־720 ₪ לשנה','בעל המקצוע מזין בניתוח לפי הצעה מדומה ב׳. זו הצעה, לא תוצאה שבוצעה.'],
 ['העלות שהושגה בפועל','30 ₪ לחודש','דיווח ביצוע של בעל המקצוע ואישור הדגמה ג׳. הנציג מזין ידנית בדוח לאחר בדיקה.'],
 ['החיסכון שהושג','55 ₪ לחודש · 660 ₪ בשווי שנתי','חישוב המערכת: 85 פחות 30 = 55; כפול 12 = 660. אין זה אישור שהצטברו כבר 660 ₪.'],
 ['זיכוי חד־פעמי','120 ₪','אישור זיכוי מדומה ד׳; הנציג מזין ידנית. לא מוכפל ב־12 ולא נכלל בחיסכון המתמשך.'],
 ['אפשרות שלא מומשה','5 ₪ לחודש · 60 ₪ בשווי שנתי','חישוב: 30 פחות 25 = 5; כפול 12 = 60. מוצג בנפרד ולא מחובר ל־55/660 שהושגו.'],
 ['מה בוצע והמלצות','שינוי מסלול, זיכוי ובדיקת החיוב הבא','ניסוח ידני של הנציג על סמך השיחה והדיווח המקצועי. המערכת מסדרת אותו בדוח; אינה מייצרת המלצה מקצועית.'],
 ['מצב סופי','הטיפול הסתיים והדוח אושר','כל פעולות התרחיש המדומה סגורות. הנציג מאשר סיום טיפול ובדיקת דוח; המערכת נועלת גרסה.'],
 ['מחיר השירות','490 ₪ כולל הכול','החלטת המשתמש. אינו נגרע אוטומטית מהחיסכון בדוח הנוכחי; יש להכריע אם וכיצד להציג תועלת לאחר העלות.'],
] as const;
