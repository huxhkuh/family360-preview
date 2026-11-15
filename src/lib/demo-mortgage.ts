import type {Document,Family,Service,Task,Workspace} from './model';
import {comparisonFinancial,type Comparison} from '../meetings/comparison';

// Synthetic presentation fixture only. These are invented rates, not a bank offer.
const principal=650000,months=240,currentAnnualRate=5.4,proposedAnnualRate=4.7,setupCost=6500;
const payment=(annualRate:number)=>{
 const monthlyRate=annualRate/1200;
 return principal*monthlyRate/(1-(1+monthlyRate)**-months);
};
const monthlyCurrent=payment(currentAnnualRate),monthlyProposed=payment(proposedAnnualRate);
const monthlySaving=monthlyCurrent-monthlyProposed;
export const mortgageScenario=Object.freeze({
 asOf:'2026-11-15',principal,months,currentAnnualRate,proposedAnnualRate,setupCost,
 monthlyCurrent,monthlyProposed,monthlySaving,grossSaving:monthlySaving*months,
 netSaving:monthlySaving*months-setupCost,totalCurrent:monthlyCurrent*months,
 totalProposedInclCosts:monthlyProposed*months+setupCost,breakEvenMonths:Math.ceil(setupCost/monthlySaving),
 firstNetIncome:12500,secondNetIncome:8500,householdNetIncome:21000,
 livingExpensesBeforeMortgage:11500,propertyValue:1750000,children:3,
});

export const mortgageDemoDocuments=[
 {id:'d-mortgage-balance',path:'demo-mortgage/balance.pdf',key:'mortgage_balance_demo',title:'יתרות ותנאי המשכנתא — מסמך סינתטי',fileName:'יתרות-משכנתא-לדוגמה.pdf',description:'יתרה, ריבית, תקופה והחזר מחושב. נוצר להדגמה ואינו מסמך בנק.'},
 {id:'d-mortgage-income',path:'demo-mortgage/income.pdf',key:'mortgage_income_demo',title:'ריכוז הכנסות ותקציב — מסמך סינתטי',fileName:'הכנסות-ותקציב-לדוגמה.pdf',description:'תמונת משק בית סינתטית: הכנסות, הוצאות והתחייבויות. אינו תלוש שכר או אישור הכנסה.'},
 {id:'d-mortgage-review',path:'demo-mortgage/review.pdf',key:'mortgage_review_demo',title:'בדיקת היתכנות וממצאים — מסמך סינתטי',fileName:'בדיקת-משכנתא-וממצאים-לדוגמה.pdf',description:'השוואה חישובית בין שני תרחישים דמיוניים באותה תקופה, עם עלויות, הנחות וצעדי המשך.'},
] as const;

type TaskDocument={id:string;document_id:string;task_id:string;kind:'analysis'|'execution';revoked_at:string|null};
export type MortgageDemoState=Pick<Workspace,'families'|'services'|'familyServices'|'documents'|'analysisTasks'|'professionalServices'|'documentTypes'|'notifications'|'timeline'> & {taskDocuments?:TaskDocument[]};

const currency=(value:number)=>new Intl.NumberFormat('he-IL',{maximumFractionDigits:2,minimumFractionDigits:2}).format(value)+' ₪';
const upsert=<T extends {id:string}>(rows:T[],record:T)=>{const old=rows.find(row=>row.id===record.id);if(old)Object.assign(old,record);else rows.push(record);};

export function installMortgageDemo(state:MortgageDemoState,at=Date.now()){
 const stamp=new Date(at).toISOString(),s=mortgageScenario;
 const familyId='f-mortgage-demo',serviceId='s-mortgage',familyServiceId='fs-mortgage-demo',taskId='a-mortgage-demo';
 const family:Family={id:familyId,name:'משפחת הדגמה — תיק משכנתא סינתטי',case_number:'DEMO-M-001',status:'in_analysis',onboarding_pct:100,representative_id:'rep1',contact_name:'ישראל ומרים לדוגמה',phone:'',email:'mortgage-demo@example.invalid',updated_at:stamp,
  internal_notes:'כל פרטי התיק והמסמכים הומצאו לצורך הצגת המערכת. אין כאן לקוח אמיתי, הצעת בנק או אישור לביצוע מחזור.',
  answers:{marital:'married',h_first:'ישראל',h_last:'לדוגמה',w_first:'מרים',w_last:'לדוגמה',children_count:s.children,has_mortgage:'yes',mort_balance:s.principal,mort_monthly:s.monthlyCurrent,mort_bank:'בנק לדוגמה — אינו בנק אמיתי',mort_remaining_months:s.months,mort_rate:s.currentAnnualRate,h_income:s.firstNetIncome,w_income:s.secondNetIncome,household_net_income:s.householdNetIncome,monthly_expenses:s.livingExpensesBeforeMortgage,property_value:s.propertyValue,other_loans:0,goal:'לבחון הפחתת עלות באותה תקופה, בלי הארכת משך ההלוואה. דוגמה בלבד.'}};
 upsert(state.families,family);
 if(!state.services.some(service=>service.id===serviceId)){
  const service:Service={id:serviceId,key:'mortgage',name:'ייעוץ ובדיקת משכנתא',active:true,trigger_conditions:[],client_fields:[],professional_fields:[{key:'mort_balance',label:'יתרת משכנתא'},{key:'mort_monthly',label:'החזר חודשי'},{key:'mort_bank',label:'בנק'}],required_documents:[]};
  state.services.push(service);
 }
 upsert(state.professionalServices,{id:'pro1'+serviceId,professional_id:'pro1',service_id:serviceId,analysis_enabled:true,execution_enabled:true});
 upsert(state.familyServices,{id:familyServiceId,family_id:familyId,service_id:serviceId,status:'in_analysis',analysis_task_id:taskId,execution_task_id:null});

 const current=`דוגמה סינתטית: יתרה ${currency(s.principal)}, קבועה לא צמודה בריבית שנתית דמיונית של ${s.currentAnnualRate}%, ל־${s.months} חודשים נוספים. החזר שפיצר מחושב: ${currency(s.monthlyCurrent)} לחודש. הכנסה משפחתית נטו: ${currency(s.householdNetIncome)}; אין הלוואות נוספות בתרחיש. הוצאות לפני משכנתא: ${currency(s.livingExpensesBeforeMortgage)}. שווי הנכס המדווח: ${currency(s.propertyValue)} — ללא שמאות.`;
 const recommendation=`לצורך הדגמת הממצאים בלבד הושווה תרחיש דמיוני בריבית קבועה לא צמודה של ${s.proposedAnnualRate}%, על אותה יתרה וללא הארכת התקופה: ${currency(s.monthlyProposed)} לחודש. הפער המחושב הוא ${currency(s.monthlySaving)} לחודש, עם עלויות חד־פעמיות מונחות של ${currency(s.setupCost)} המשולמות בנפרד. איזון חישובי לאחר ${s.breakEvenMonths} חודשים; הפרש מצטבר נומינלי לאחר העלויות: ${currency(s.netSaving)} לאורך יתרת התקופה. זו אינה הצעת בנק או המלצה אישית. לפני כל החלטה נדרשים מסמכי אמת, הצעות כתובות ואימות עלויות הסילוק והמחזור.`;
 const summary=`בתרחיש ההדגמה בלבד נמצאה אפשרות חישובית להפחתה של כ־252 ₪ בהחזר החודשי, ללא הארכת 20 השנים שנותרו. העלויות המונחות הן 6,500 ₪, ולכן נקודת האיזון היא כ־26 חודשים. הנתונים מומצאים והממצא הוא אומדן בלבד. הצעד הבא: לאמת דוח יתרות וסילוק, לקבל הצעות כתובות ולבדוק עלויות ותנאים לפני החלטה. טרם ניתן אישור לביצוע.`;
 const comparison:Comparison={kind:'expense',period:'monthly',status:'estimate',current:s.monthlyCurrent,proposed:s.monthlyProposed,setup_cost:s.setupCost,current_detail:current,proposed_detail:recommendation,
  basis:`חישוב שפיצר: קרן ${currency(s.principal)}, ${s.months} חודשים, ריבית קבועה לא צמודה ${s.currentAnnualRate}% מול ${s.proposedAnnualRate}%. בשני התרחישים אותה תקופה. העלויות משולמות מראש ואינן ממומנות. החישוב משתמש בערכים מלאים; ייתכנו הפרשי אגורות בתצוגה מעוגלת.`,
  conditions:'מסמכים ונתונים סינתטיים בלבד; הריביות והעלויות הומצאו ואינן הצעת בנק. אין היוון, הצמדה, שינוי ריבית, ביטוחים, עמלות נוספות או מימון עלויות בתוך הקרן. השווי אינו שמאות. יש לאמת זכאות, הכנסות, מסמכי הלוואה, דוח סילוק, עלויות והצעות כתובות. אין חיסכון מובטח ואין אישור לביצוע.',
  current_source:'יתרות ותנאי המשכנתא — מסמך סינתטי, עמוד 1; ריכוז הכנסות ותקציב — מסמך סינתטי, עמוד 1.',
  proposed_source:'בדיקת היתכנות וממצאים — מסמך סינתטי, עמוד 1. תרחיש מחושב בלבד, ללא הצעת בנק.',checked_on:s.asOf,valid_until:''};
 const task:Task={id:taskId,family_id:familyId,family_service_id:familyServiceId,service_id:serviceId,professional_id:'pro1',task_number:'M-001',status:'in_progress',due_at:new Date(at+86400000).toISOString(),
  instructions:'תיק משכנתא סינתטי מלא לזום — משפחת ישראל ומרים לדוגמה. כל הנתונים, המסמכים והממצאים מוכנים להדגמה. עברו על 3 המסמכים, הציגו את ההשוואה ובדקו את הסיכום לפני הגשה. אפשר לערוך ולשמור טיוטה; הגשה היא פעולה בדמו בלבד. אין לקוח אמיתי ואין אישור למחזור.',
  snapshot:[{label:'משפחה — דוגמה בלבד',value:'ישראל ומרים לדוגמה, זוג ושלושה ילדים'},{label:'מטרת הבדיקה',value:'בחינת עלות באותה תקופה, ללא הארכה — תרחיש סינתטי'},{label:'בנק',value:'בנק לדוגמה — אינו בנק אמיתי'},{label:'יתרה לסילוק בתרחיש',value:currency(s.principal)},{label:'תקופה שנותרה',value:'240 חודשים · 20 שנים'},{label:'מסלול וריבית שנתית דמיונית',value:'קבועה לא צמודה · 5.40%'},{label:'החזר חודשי מחושב',value:currency(s.monthlyCurrent)},{label:'הכנסה משפחתית נטו',value:currency(s.householdNetIncome)},{label:'הוצאות שוטפות לפני משכנתא',value:currency(s.livingExpensesBeforeMortgage)},{label:'הלוואות נוספות בתרחיש',value:'אין'},{label:'שווי נכס מדווח — ללא שמאות',value:currency(s.propertyValue)},{label:'יחס החזר להכנסה — חישוב הדגמה',value:(s.monthlyCurrent/s.householdNetIncome*100).toFixed(2)+'%'},{label:'יחס מימון — חישוב הדגמה',value:(s.principal/s.propertyValue*100).toFixed(2)+'%'}],
  current_situation:current,recommendation,client_summary:summary,result_tone:'yellow',financial:comparisonFinancial({},comparison),
  internal_note:'הערה לנציג: תיק זה הוכן להצגת הזרימה בלבד. הממצאים הם טיוטה מלאה לעריכה ואינם ניתוח של לקוח. לשיחה עם היועץ: לוודא אילו מסמכי יתרות וסילוק דרושים, מה הוא מוכן לכלול בבדיקה ראשונית ומה זמן התגובה המוסכם. אין להציג 4.7% כריבית זמינה או להבטיח חיסכון.',
  findings:[{title:'התאמה בין חומר המקור לחישוב',detail:'היתרה, התקופה וההחזר חושבו מאותן הנחות סינתטיות במסמכי התיק.'},{title:'השוואה באותה תקופה',detail:'החלופה משאירה 240 חודשים; הפחתת התשלום אינה נובעת מהארכת ההלוואה.'},{title:'עלויות ונתונים לאימות',detail:'6,500 ₪ הם הנחת הדגמה בלבד. לפני טיפול יש לברר עלויות סילוק, עמלות, הצעת בנק ויכולת החזר.'}],
  actions:[{title:'אימות מסמכי הלוואה וסילוק',status:'pending'},{title:'קבלת הצעות בנק כתובות',status:'pending'},{title:'הסבר הממצאים למשפחה ותיעוד החלטה',status:'pending'}],attachments:[],
  result_values:{synthetic:true,gross_nominal_saving:s.grossSaving,net_nominal_saving:s.netSaving,break_even_months:s.breakEvenMonths,total_current:s.totalCurrent,total_proposed_including_costs:s.totalProposedInclCosts}};
 upsert(state.analysisTasks,task);
 state.taskDocuments??=[];
 for(const metadata of mortgageDemoDocuments){
  const typeId='dt-'+metadata.key;
  upsert(state.documentTypes,{id:typeId,key:metadata.key,name:metadata.title,type:'file',active:true,description:metadata.description});
  const doc:Document={id:metadata.id,family_id:familyId,document_type_id:typeId,name:metadata.title,key:metadata.key,type:'file',status:'approved',storage_path:metadata.path,file_name:metadata.fileName,mime_type:'application/pdf',purpose:metadata.description,subject:'ישראל ומרים לדוגמה — משפחה סינתטית',period:s.asOf,source_hint:'קובץ שהוכן במיוחד לדמו; אינו מסמך בנק או מסמך לקוח.'};
  upsert(state.documents,doc);
  upsert(state.taskDocuments,{id:'share-'+metadata.id,document_id:metadata.id,task_id:taskId,kind:'analysis',revoked_at:null});
 }
 upsert(state.notifications,{id:'notice-mortgage-demo',title:'תיק משכנתא סינתטי מוכן להצגה',body:'M-001 כולל נתוני משפחה, שלושה מסמכי PDF וממצאים מלאים לעריכה. כל הנתונים הומצאו לצורך הדגמה.',profile_id:'professional1',family_id:familyId,audience:'professional',read_at:null});
 upsert(state.timeline,{id:'timeline-mortgage-demo',family_id:familyId,title:'נוצר תיק משכנתא סינתטי עם מסמכים וממצאים להדגמת תהליך הבדיקה',created_at:stamp});
 return taskId;
}
