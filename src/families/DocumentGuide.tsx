import type {Document} from '../lib/model';

export function DocumentGuide({documents}:{documents:Document[]}){
 const missing=documents.filter(d=>!d.optional&&['missing','rejected'].includes(d.status)).length;
 const pending=documents.filter(d=>d.status==='pending').length;
 const optional=documents.filter(d=>d.optional&&['missing','rejected'].includes(d.status)).length;
 const reviewed=documents.filter(d=>['approved','signed'].includes(d.status)).length;
 const counts=[missing?`בקשות מהנציג להשלמה: ${missing}`:'',optional?`פריטי רשות שטרם צורפו: ${optional}`:'',pending?`בבדיקה: ${pending}`:'',reviewed?`אושרו או תועדו: ${reviewed}`:''].filter(Boolean).join(' · ');
 return <section className="document-guide" aria-label="מה צריך לצרף">
  <h2>המסמכים שבתיק</h2>
  <p>ליד כל בקשה מצוין אם היא נדרשת לבדיקה או שהיא רשות. אפשר לשלוח את השאלון לפני צירוף המסמכים; בקשות נדרשות יישארו להשלמה בתיק. אין צורך לצרף מסמך לכל שאלה.</p>
  {counts&&<p role="status">{counts}</p>}
  <details><summary>אילו מסמכים יכולים לעזור לבדיקה?</summary><p>דוגמאות מתוך הגדרות המערכת. זו אינה רשימת חובה אישית; הנציג מאשר מה רלוונטי לכם.</p><ul>
   <li>פנסיה וביטוח: דוח פנסיה שנתי אם יש, ת״ז וספח מעודכן והרשאה לאיתור מידע, לפי הבקשה. החתימה נדרשת לפני פנייה למסלקה; אפשר להשלים את השאלון לפני החתימה. בדמו מוצג נוסח הדגמה בלבד.</li>
   <li>הכנסות: תלוש שכר מומלץ לבדיקת השכר והניכויים. שומת מס נדרשת לייעוץ מס לעצמאי; שנת המס המדויקת עדיין לבירור.</li>
   <li>בנק והלוואות: תעודת זהות בנקאית, אם יש. פירוט הלוואות אינו מתבקש אוטומטית עד שתוגדר מטרת הבדיקה.</li>
   <li>דיור: מסמך משכנתא נדרש לצורך בדיקת משכנתא. חוזה שכירות הוא רשות; שם דוח המשכנתא המדויק עדיין לבירור.</li>
   <li>חשבונות שוטפים: חשבון ארנונה וחשבון חשמל, אם יש.</li>
  </ul><p>הרשאה היא פעולה נפרדת מהעלאת קובץ: קוראים את הנוסח ורק אז נותנים הסכמה. אם אין נוסח, פונים לנציג.</p></details>
  <p className="hint">בדמו לא מעלים מסמכים אישיים. אפשר לצרף קובץ דוגמה מובנה כדי לראות את שלב ההמתנה לבדיקה; שום קובץ לא נשלח לשרת.</p>
 </section>;
}
