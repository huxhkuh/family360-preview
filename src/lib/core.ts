export function configuration(url: string, key: string) {
  if (!url && !key) return null;
  const parsed = new URL(url);
  if (!key || /YOUR-|xxxxx/i.test(url + key) || key.startsWith('sb_secret_')) throw new Error('CONFIG_INVALID');
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(parsed.hostname))) throw new Error('CONFIG_INVALID');
  if (key.startsWith('ey')) {
    try { if (JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role !== 'anon') throw new Error(); }
    catch { throw new Error('CONFIG_INVALID'); }
  }
  return { url: parsed.origin, key };
}
export type Rule = {field: string; op: string; value?: unknown};
export function conditionMatches(answers: Record<string,unknown>, rule: Rule): boolean {
  const value=answers[rule.field];
  const exists=value!==undefined && value!==null && value!=='' && !(Array.isArray(value)&&!value.length);
  if(rule.op==='exists') return exists;
  if(!exists) return false;
  if(rule.value===undefined||rule.value===null) return false;
  if(['h_emp','w_emp'].includes(rule.field)&&typeof rule.value==='string'){
    if(Array.isArray(value)&&['equals','not_equals','contains'].includes(rule.op))return rule.op==='not_equals'?!value.includes(rule.value):value.includes(rule.value);
    if(rule.op==='contains'&&typeof value==='string')return value===rule.value;
  }
  switch(rule.op){
    case 'equals': return value===rule.value;
    case 'not_equals': return value!==rule.value;
    case 'contains': return Array.isArray(value)&&value.includes(rule.value);
    case 'gt': return Number(value)>Number(rule.value);
    case 'lt': return Number(value)<Number(rule.value);
    default: return false;
  }
}
export function priority(tasks: {status:string;due_at?:string|null}[], docs:{status:string}[], now=Date.now()) {
  const overdue=tasks.filter(t=>['assigned','in_progress','needs_info','sent_execution','execution_in_progress','waiting_client'].includes(t.status)&&t.due_at&&Date.parse(t.due_at)<now).length;
  const missing=docs.filter(d=>['missing','rejected'].includes(d.status)).length;
  return {score:overdue*10+missing*2, reasons:[...(overdue?[`${overdue} משימות חרגו מזמן הטיפול`]:[]),...(missing?[`${missing} מסמכים חסרים או נדחו`]:[])]};
}
export async function validateUpload(file:File) {
  if(file.size<=0||file.size>20*1024*1024) throw new Error('FILE_SIZE');
  const extensions:Record<string,RegExp>={'application/pdf':/\.pdf$/i,'image/png':/\.png$/i,'image/jpeg':/\.jpe?g$/i,'image/webp':/\.webp$/i};
  if(!extensions[file.type]?.test(file.name)) throw new Error('FILE_TYPE');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const text=new TextDecoder().decode(bytes);
  const valid=file.type==='application/pdf'?text.startsWith('%PDF-'):file.type==='image/png'?
    [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):file.type==='image/jpeg'?
    bytes[0]===255&&bytes[1]===216&&bytes[2]===255:text.startsWith('RIFF')&&text.slice(8,12)==='WEBP';
  if(!valid) throw new Error('FILE_TYPE');
}
export function safeMessage(error:unknown) {
  const raw=error&&typeof error==='object'&&'message' in error?String(error.message):'';
  const messages:Record<string,string>={
    UNSAVED_EXECUTION_UPDATE:'יש טיוטת עדכון שלא נשמרה. חזרו ללשונית העדכון ושמרו או בטלו אותה לפני דיווח הסיום.',
 DEMO_UNAVAILABLE:'פעולה זו אינה מופעלת בדמו. אין משלוח הודעות, שינוי חשבונות, חיוב או העברת קבצים לשרת.',
    INVITE_INVALID:'קישור ההזמנה אינו תקף, פג תוקפו, בוטל או כבר נוצל. יש לפנות למנהל לקבלת קישור חדש.',
    INVITE_ACCOUNT_CONFLICT:'לחשבון הזה כבר משויך תפקיד או תיק לקוח. יש לפנות למנהל לפני שינוי התפקיד.',
    EMAIL_NOT_VERIFIED:'יש לאמת תחילה את כתובת הדוא״ל דרך ההודעה שנשלחה אליך.',
    INVITE_LIMIT:'הגעת למכסת ההזמנות היומית. אפשר לנסות שוב מאוחר יותר.',
    CONFLICT:'הנתונים עודכנו בידי משתמש אחר. יש לרענן לפני שמירה.',
    PERMISSION_DENIED:'אין הרשאה לפעולה זו. ייתכן שהגישה לחשבון השתנתה.',
    MFA_REQUIRED:'נדרש אימות דו־שלבי לחשבון המנהל.',
    UNDECIDED_ITEMS:'יש לתעד החלטה בכל התחומים לפני סיום הפגישה.',
    INVALID_STATE:'הפעולה אינה מתאימה למצב הנוכחי. יש לרענן ולנסות שוב.',
    VALIDATION:'יש לבדוק את שדות החובה ואת סוגי הערכים.',
    FILE_SIZE:'יש לבחור קובץ שאינו ריק ועד 20MB.', FILE_TYPE:'הקובץ אינו נתמך או שתוכנו אינו תואם לסוג שלו.',
    'Invalid login credentials':'פרטי הכניסה שגויים.',
    CONFIG_INVALID:'הגדרות החיבור אינן תקינות. יש לפנות למנהל המערכת.',
  };
  return Object.entries(messages).find(([key])=>raw.includes(key))?.[1]||'הפעולה לא הושלמה. יש לבדוק את החיבור ולנסות שוב.';
}
export const statusLabels:Record<string,string>={new:'חדש',waiting_docs:'ממתין למסמכים',waiting_analysis:'ממתין לניתוח',in_analysis:'בניתוח',ready_meeting:'מוכן לפגישה',meeting_set:'פגישה נקבעה',meeting_done:'התקיימה פגישה',in_execution:'בביצוע',archived:'ארכיון',missing:'חסר',pending:'ממתין לבדיקה',approved:'אושר',rejected:'נדחה',signed:'הסכמה תועדה',assigned:'הוקצה',in_progress:'בטיפול',needs_info:'נדרשת השלמה',submitted:'הוגש',returned:'הוחזר',analysis_received:'ניתוח התקבל',approved_analysis:'ניתוח אושר',client_approved_execution:'לקוח אישר ביצוע',client_declined:'לקוח דחה',client_thinking:'בהתלבטות',no_execution_needed:'לא נדרש ביצוע',sent_execution:'נשלח לביצוע',execution_in_progress:'בביצוע',waiting_client:'ממתין ללקוח',execution_needs_info:'נדרשת השלמה',execution_reported_complete:'ממתין לאישור סיום',completed:'הושלם',not_completed:'לא הושלם',cancelled:'בוטל',reassigned:'הוקצה מחדש',scheduled:'מתוכננת',undecided:'לא הוחלט',progress:'להתקדם',thinking:'לחשוב',declined:'לא להתקדם',no_action:'אין צורך בפעולה'};
