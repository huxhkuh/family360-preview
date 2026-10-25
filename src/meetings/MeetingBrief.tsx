import type {MeetingItem,Workspace} from '../lib/model';
import {comparisonGaps,readComparison} from './comparison';
export function MeetingBrief({items,w,familyId}:{items:MeetingItem[];w:Workspace;familyId:string}){
 const family=w.families.find(f=>f.id===familyId);const documents=w.documents.filter(d=>d.family_id===familyId);
 const missing=items.filter(item=>item.visible_to_client&&comparisonGaps(readComparison(item.financial?.comparison)).length>0);
 return <section className="call-preparation-brief" aria-label="המידע וההכנה של הנציג"><h3>מה עומד לרשותך לפני הפגישה?</h3><ol><li><strong>המידע מהמשפחה</strong><p>{family?.onboarding_pct===100?'השאלון נשלח לבדיקה.':'השאלון עדיין לא הושלם.'} {documents.length} מסמכים בתיק. התשובות, הנושאים לבירור והמסמכים זמינים למעלה, בלי לצאת מהפגישה.</p></li><li><strong>הממצאים שהוכנו לשיחה</strong><p>בכל נושא מופיעים המצב כיום, ההמלצה וההשוואה שנשמרו לקראת הפגישה. הנציג מסביר אותם למשפחה ומתעד את החלטתה.</p></li><li><strong>התפקיד שלך בשיחה</strong><p>מאמתים פרטים, מסבירים נושא אחד בכל פעם, שומרים החלטה וממשיכים. אחר כך עוברים על רשימת הבדיקה ומסכמים מי עושה מה ומתי.</p></li></ol>{missing.length>0&&<p className="hint">ב־{missing.length} מהנושאים המשותפים עדיין חסרים פרטי השוואה. בדקו את סימוני ״דורש בירור״; נתון חסר הוא נושא להשלמה עם בעל המקצוע לפני המלצה לביצוע.</p>}</section>;
}
