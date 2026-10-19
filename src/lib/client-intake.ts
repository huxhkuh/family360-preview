import type {Family,Workspace} from './model';
import {nextStep,type Destination} from './workflow';

// Presentation only: an empty request list is not proof that all documents were approved.
export function clientIntake(family:Family,w:Workspace){
 const documents=w.documents.filter(d=>d.family_id===family.id);
 const missing=documents.filter(d=>['missing','rejected'].includes(d.status));
 const pending=documents.filter(d=>d.status==='pending');
 const submitted=family.onboarding_pct===100;
 const next=nextStep(family,w);
 const terminal=['completed','archived'].includes(family.status);
 const stage=terminal?3:!submitted?1:missing.length?2:3;
 const action=!terminal&&!submitted?{title:'ממלאים ושולחים את השאלון',detail:'מלאו את פרטי המשפחה. אפשר לשמור טיוטה ולחזור אליה; רק שליחה לבדיקה מסיימת את השלב.',label:'המשך לשאלון',target:'questionnaire' as Destination}
 :!terminal&&missing.length?{title:missing.length===1?'נותר מסמך או הרשאה להשלמה':`נותרו ${missing.length} מסמכים או הרשאות להשלמה`,detail:'פתחו את רשימת הבקשות. ליד כל פריט מופיעים המצב ומה צריך לעשות.',label:'להשלמת המסמכים',target:'documents' as Destination}
 :!terminal&&pending.length?{title:'המסמכים אצל הנציג לבדיקה',detail:'כרגע אין צורך להעלות אותם שוב. אם יידרש תיקון, תופיע בקשה ליד המסמך. הנציג יבדוק את החומר ויתאם איתכם את ההמשך.',label:'צפייה במצב המסמכים',target:'documents' as Destination}
 :next;
 return {documents,missing,pending,submitted,stage,action,terminal};
}
