import {useState} from 'react';
import type {Task,Workspace} from '../lib/model';
import {findingsDraft,professionalPreparation} from './professional-preparation';

function valueText(value:unknown):string{
 if(value===null||value===undefined||value==='')return 'לא נמסר';
 if(Array.isArray(value))return value.length?value.map(valueText).join(', '):'לא נמסר';
 if(typeof value==='object')return Object.entries(value).map(([key,item])=>key+': '+valueText(item)).join(' · ');
 if(typeof value==='boolean')return value?'כן':'לא';
 return String(value);
}
export function ProfessionalPreparation({w,task}:{w:Workspace;task:Task}){
 const [draft,setDraft]=useState<string|null>(null);
 const prep=professionalPreparation(w,task);if(!prep)return null;
 const sourceDraft=findingsDraft(task);
 return <section className="work-guidance" aria-label="הכנה למשימה מקצועית">
  <h3>המידע שקיבלתם לבדיקה</h3>
  <p>סיכום מתוך הנתונים שהועברו אליכם. בדקו כל פרט מול מקורו לפני קביעת ממצאים.</p>
  <ul>
   <li>נתוני דיווח שהועברו למשימה: {prep.fields.length} שדות.</li>
   <li>{prep.missing.length?'נתונים חסרים בחומר שהועבר: '+prep.missing.map(f=>f.label).join(', '):prep.fields.length?'לא זוהו שדות ריקים בחומר שהועבר.':'לא הועברו שדות דיווח למשימה.'}</li>
   <li>מסמכים ששותפו איתכם בתיק זה: {prep.documents.length}. {prep.documents.length>0&&<a href="#professional-shared-documents" onClick={()=>document.getElementById('professional-shared-documents')?.closest('details')?.setAttribute('open','')}>למסמכים המשותפים</a>}</li>
   <li>{prep.hasFindings?'קיימים ממצאים או סיכום שמורים במשימה.':'לא נמצאו ממצאים או סיכום בשדות שנבדקו.'}</li>
  </ul>
  {prep.fields.length>0&&<details id="professional-task-source"><summary>נתוני הדיווח שהועברו למשימה</summary><dl>{prep.fields.map((f,i)=><div key={i}><dt>{f.label}</dt><dd>{valueText(f.value)}</dd></div>)}</dl></details>}

  <p className="muted">רשימת המסמכים כוללת מסמכים ששותפו איתכם בתיק; אין במידע הזמין שיוך מדויק לכל משימה. היעדר שדות אינו מעיד שהתיק שלם.</p>
  <details><summary>טיוטת ניסוח מתוך הממצאים השמורים</summary>
   <p>הטיוטה מאגדת את הטקסט השמור במשימה. יש לערוך ולבדוק אותה מול המקורות לפני השימוש.</p>
   {sourceDraft?(draft===null?<button type="button" onClick={()=>setDraft(sourceDraft)}>הכנת טיוטה לעריכה</button>:<><label>טיוטה לבדיקה<textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={8}/></label><p className="muted">הטקסט נשאר במסך הזה בלבד, אינו נשמר בתיק ואינו נשלח.</p></>):<p>אין טקסט שמור במצב הקיים, בהמלצה או בסיכום ללקוח שאפשר להכין ממנו טיוטה.</p>}
  </details>
 </section>;
}
