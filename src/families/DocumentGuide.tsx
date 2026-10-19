import type {Document} from '../lib/model';

export function DocumentGuide({documents}:{documents:Document[]}){
 const missing=documents.filter(d=>['missing','rejected'].includes(d.status)).length;
 const pending=documents.filter(d=>d.status==='pending').length;
 return <section className="document-guide" aria-label="מה צריך לצרף">
  <h2>אילו מסמכים צריך?</h2>
  <p>הכרטיסים בהמשך הם הבקשות בתיק שלכם. אין צורך לצרף את כל סוגי המסמכים, ואין להעלות שוב מסמך שכבר ממתין לבדיקה.</p>
  <p role="status">{documents.length?`${missing} להשלמה · ${pending} ממתינים לבדיקת הנציג · ${documents.filter(d=>['approved','signed'].includes(d.status)).length} אושרו או נחתמו`:'אין כרגע בקשות למסמכים בתיק. הנציג יבדוק מה נדרש לפי פרטי המשפחה.'}</p>
  <details><summary>מה עשוי להידרש, לפי תחום הבדיקה?</summary><p>דוגמאות מתוך הגדרות המערכת. זו אינה רשימת חובה אישית; הנציג מאשר מה רלוונטי לכם.</p><ul>
   <li>פנסיה וביטוח: ת״ז וספח מעודכן והרשאה לאיתור מידע, לפי הבקשה. בדמו יש גם דוח פנסיה שנתי לדוגמה.</li>
   <li>הכנסות: 3 תלושי שכר אחרונים, או שומת מס אחרונה לעצמאי.</li>
   <li>בנק והלוואות: דפי עו״ש של 3 החודשים האחרונים ואסמכתאות להלוואות פעילות.</li>
   <li>דיור: דוח יתרות משכנתא מהבנק או חוזה שכירות בתוקף, לפי העניין.</li>
   <li>חשבונות שוטפים: חשבון ארנונה או חשמל, אם התבקשו לבדיקה.</li>
  </ul><p>הרשאה היא פעולה נפרדת מהעלאת קובץ: קוראים את הנוסח ורק אז נותנים הסכמה. אם אין נוסח, פונים לנציג.</p></details>
  <p className="hint">בדמו לא מעלים מסמכים אישיים. אפשר לצרף קובץ דוגמה מובנה כדי לראות את שלב ההמתנה לבדיקה; שום קובץ לא נשלח לשרת.</p>
 </section>;
}
