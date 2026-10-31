import {useState} from 'react';
import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {canLaunchMeetings} from '../meetings/meeting-launch';
import {MeetingDrafts} from './MeetingDrafts';
import {meetingBrief} from './meeting-brief';
import './meeting-brief.css';

export function MeetingBrief({w,open}:{w:Workspace;open:(route:RouteState)=>void}){
 const [selected,setSelected]=useState('');
 if(!canLaunchMeetings(w))return null;
 const families=w.families.filter(f=>!['archived','completed'].includes(f.status));
 const familyId=families.some(f=>f.id===selected)?selected:'';
 const brief=familyId?meetingBrief(w,familyId):null;
 return <section className="brief-panel" aria-labelledby="brief-title">
  <div><p className="eyebrow">לקראת השיחה</p><h2 id="brief-title">תמונה לקראת הפגישה</h2><p>תשובות, מסמכים ונושאים פתוחים מתוך התיק, לעיון לפני השיחה.</p></div>
  <label>בחירת משפחה <select value={familyId} onChange={e=>setSelected(e.target.value)}><option value="">בחרו תיק משפחה</option>{families.map(f=><option key={f.id} value={f.id}>{f.name} · {f.case_number}</option>)}</select></label>
  {w.familiesTruncated&&<p>הרשימה מציגה את התיקים שנטענו. אפשר לחפש תיקים נוספים ברשימת המשפחות.</p>}
  {brief&&<div className="brief-sections">
   <section><h3>מה המשפחה מסרה</h3><p>מקור: תשובות השאלון. התשובות טרם מעידות על בדיקה מקצועית.</p>{brief.answered.length?<ul>{brief.answered.slice(0,6).map(i=><li key={i.key}><span>{i.chapter} · {i.label}: {i.value}</span></li>)}</ul>:<p>לא נמצאו תשובות בתיק שנטען.</p>}<button className="ghost" onClick={()=>open({page:'families',id:familyId,tab:'questionnaire'})}>לשאלון המלא</button></section>
   <section><h3>מידע לבירור</h3><p>שדות שלא מולאו אינם מעידים בהכרח על חוסר; כדאי לבדוק מה מתאים לשיחה.</p>{brief.missing.length?<ul>{brief.missing.slice(0,5).map(i=><li key={i.key}>{i.chapter} · {i.label}</li>)}</ul>:<p>לא זוהו שדות ריקים בשאלון שהוצג.</p>}<button className="ghost" onClick={()=>open({page:'families',id:familyId,tab:'questionnaire'})}>לבדיקת השאלון</button></section>
   <section><h3>מסמכים ופעולות פתוחות</h3><p>מקור: רשימת המסמכים והמעקב בתיק.</p>{brief.documents.length?<ul>{brief.documents.slice(0,5).map(d=><li key={d.id}>{d.name} · {d.status==='rejected'?'נדרש תיקון':'טרם התקבל'}{d.optional?' · רשות':''}</li>)}</ul>:<p>לא זוהו מסמכים חסרים ברשימה שנטענה.</p>}{brief.openTasks.length>0&&<p>{brief.openTasks.length} פעולות פתוחות או בתהליך בתיק.</p>}<div className="brief-actions"><button className="ghost" onClick={()=>open({page:'families',id:familyId,tab:'documents'})}>למסמכים</button><button className="ghost" onClick={()=>open({page:'families',id:familyId,tab:'followups'})}>למעקב</button></div></section>
  </div>}
  {brief&&<MeetingDrafts key={familyId} w={w} familyId={familyId}/>}
 </section>;
}

