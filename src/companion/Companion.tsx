import {useState,type ReactNode} from 'react';
import './companion.css';
export type Pose='welcome'|'explain'|'pause'|'document'|'later'|'success'|'review'|'complete';
export function CompanionPortrait({pose,className=''}:{pose:Pose;className?:string}){
 return <span className={`companion-portrait ${className}`} data-pose={pose} aria-hidden="true"><img src={`${import.meta.env.BASE_URL}companion/${pose}.webp`} alt="" width="160" height="230" draggable={false}/></span>;
}
export function Companion({pose,title,children}:{pose:Pose;title:string;children:ReactNode}){
 return <aside className={`companion companion-${pose}`} aria-label={title}>
  <CompanionPortrait pose={pose}/><div className="companion-content"><span className="companion-label">המלווה שלכם · הדרכה במערכת</span><h3>{title}</h3>{children}</div>
 </aside>;
}
const why:Record<string,[string,string]>={
 family:['למה מתחילים בהיכרות?','הרכב המשפחה ופרטי הקשר עוזרים לשייך את המידע לאנשים הנכונים ולהציג רק שאלות שמתאימות לכם. אפשר להשתמש בפרטי הקשר שכבר בתיק.'],
 work:['למה צריך את פרטי ההכנסות?','מקורות ההכנסה והעיסוקים מאפשרים לנציג להבין את התמונה החודשית ולהכין בירור של זכויות ומס. אם עובדים בכמה מסגרות, חשוב לסמן את כולן.'],
 housing:['למה שואלים על המגורים?','ההוצאה על דיור היא חלק מהתמונה המשפחתית. בעלות ושכירות מובילות לשאלות ולמסמכים שונים; התשובה אינה קובעת זכאות לסיוע.'],
 mortgage:['איך פרטי המשכנתא עוזרים?','היתרה וההחזר החודשי מאפשרים לנציג להבין את ההתחייבות. הדוח יעזור להשלים נתונים מדויקים; אין כאן שינוי של ההלוואה.'],
 savings:['למה חשוב למפות את החסכונות?','כדי להבין אילו מוצרים כבר קיימים ומה כדאי לבדוק. אם לא מכירים הכול, אפשר לציין זאת בשאלה המתאימה ולהיעזר בנציג.'],
 insurance:['למה צריך לדעת אילו ביטוחים קיימים?','מיפוי הכיסויים מסייע להכין בדיקה מקצועית. מילוי השאלון אינו משנה או מבטל ביטוח.'],
 loans:['למה מפרטים כל הלוואה?','כדי להבין את סך ההתחייבויות ואת ההחזרים החודשיים. משכנתא נרשמת בפרק שלה, כך שלא סופרים אותה פעמיים.'],
 rights:['למה שואלים על הזכויות שלכם?','התשובות מכוונות את השיחה לבירורים שרלוונטיים לכם. אין כאן קביעה של זכאות; בשאלות המתאימות אפשר לבחור שלא יודעים או להעדיף שיחה.'],
 banks:['איך פרטי הבנק עוזרים?','מספר החשבונות והעמלות עוזר למפות את ההוצאות השוטפות. אין למסור סיסמה, קוד אימות או פרטי כרטיס אשראי.'],
 weddings:['למה לדבר גם על התוכניות קדימה?','יעדים משפחתיים עוזרים להבין לקראת מה מתכננים. זהו פרק רשות; אפשר למלא רק מה שכבר ידוע.'],
};
export function ChapterCompanion({chapter,description}:{chapter:string;description:string}){
 const [open,setOpen]=useState(false);const copy=why[chapter]||['למה המידע הזה חשוב?',description];
 return <div className="chapter-companion"><CompanionPortrait pose={open?'explain':'welcome'}/>
  <details className="speech-bubble" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{copy[0]}</summary><div className="chapter-speech-content"><p>{copy[1]}</p><p className="muted">{description}</p></div></details>
 </div>;
}
