import {useState} from 'react';
import type {Workspace} from '../lib/model';
import {clientDraft,draftOptions,professionalDraft} from './meeting-drafts';

export function MeetingDrafts({w,familyId}:{w:Workspace;familyId:string}){
 const data=draftOptions(w,familyId);
 const [docId,setDocId]=useState('');
 const [serviceId,setServiceId]=useState('');
 const [draft,setDraft]=useState('');
 const [notice,setNotice]=useState('');
 if(!data)return null;
 const prepare=(text:string|null)=>{if(text){setDraft(text);setNotice('');}};
 const copy=async()=>{try{await navigator.clipboard.writeText(draft);setNotice('הטיוטה הועתקה.');}catch{setNotice('לא הצלחנו להעתיק. אפשר לסמן את הטקסט ולהעתיק ידנית.');}};
 return <section className="brief-drafts" aria-labelledby="draft-title">
  <h3 id="draft-title">טיוטות לנציג</h3>
  <p>תבניות מתוך הנתונים בתיק. בדקו וערכו לפני העתקה; לא נשלחת הודעה ולא נשמרת טיוטה. הטקסט אינו נוצר באמצעות AI.</p>
  <div className="brief-draft-options">
   <div><label htmlFor="brief-doc">הודעה ללקוח על מסמך</label><select id="brief-doc" value={docId} onChange={e=>setDocId(e.target.value)}><option value="">בחירת מסמך חסר</option>{data.documents.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><button className="ghost" disabled={!docId} onClick={()=>prepare(clientDraft(w,familyId,docId))}>הכנת טיוטה ללקוח</button>{!data.documents.length&&<p>אין מסמכי חובה חסרים ברשימה שנטענה.</p>}</div>
   <div><label htmlFor="brief-service">בקשה לבעל מקצוע</label><select id="brief-service" value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">בחירת תחום בתיק</option>{data.services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button className="ghost" disabled={!serviceId} onClick={()=>prepare(professionalDraft(w,familyId,serviceId))}>הכנת טיוטה לבעל מקצוע</button>{!data.services.length&&<p>לא נבחר תחום טיפול בתיק שנטען.</p>}</div>
  </div>
  {draft&&<div className="brief-draft-editor"><label htmlFor="brief-draft">טיוטה לעריכה</label><textarea id="brief-draft" value={draft} onChange={e=>{setDraft(e.target.value);setNotice('');}} rows={6}/><button className="ghost" disabled={!draft.trim()} onClick={copy}>העתקת הטיוטה</button><p role="status">{notice}</p></div>}
 </section>;
}
