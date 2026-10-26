import type {Meeting,Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {Icon} from '../icons';
import {canLaunchMeetings,meetingLaunches} from './meeting-launch';
import './meeting-launch.css';

function meetingDate(meeting:Meeting){
 const time=meeting.scheduled_at?Date.parse(meeting.scheduled_at):NaN;
 return Number.isFinite(time)?new Date(time).toLocaleString('he-IL',{
  dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jerusalem',
 }):'מועד טרם נקבע';
}

export function MeetingLaunch({w,open}:{w:Workspace;open:(route:RouteState)=>void}){
 if(!canLaunchMeetings(w))return null;
 const meetings=meetingLaunches(w);const current=meetings[0];
 const family=w.families.find(f=>f.id===current?.family_id);
 const enter=(meeting:Meeting)=>open({page:'meetings',id:meeting.id,family:meeting.family_id});
 if(!current)return <section className="meeting-launch meeting-launch-empty" aria-label="כניסה לפגישה">
  <div><p className="eyebrow">מתכוננים לשיחה הבאה</p><h2>אין כרגע פגישה פתוחה</h2><p>פותחים את תיק המשפחה כדי להשלים את ההכנה ולתאם פגישה.</p></div>
  <button onClick={()=>open({page:'families'})}>בחירת משפחה</button>
 </section>;
 const inProgress=current.status==='in_progress';
 const late=!inProgress&&!!current.scheduled_at&&Date.parse(current.scheduled_at)<Date.now();
 return <section className="meeting-launch" aria-label="כניסה לפגישה">
  <div className="meeting-launch-main">
   <div className="meeting-launch-copy">
    <p className="eyebrow"><Icon name={inProgress?'clock':'meetings'}/>{inProgress?'הפגישה פתוחה — אפשר להמשיך':'הפגישה הבאה שלך'}</p>
    <h2>{family?.name||'פגישה עם המשפחה'}</h2>
    <div className="meeting-launch-contact"><span>{family?.contact_name||'איש קשר טרם הוגדר'}</span>{family?.phone?<bdi>{family.phone}</bdi>:<span>טלפון טרם הוגדר</span>}</div>
    <p className="meeting-launch-date">{meetingDate(current)}{late&&<span> · המועד המתוכנן עבר</span>}</p>
   </div>
   <div className="meeting-launch-action">
    <p>{inProgress?'ממשיכים מההחלטות שכבר נשמרו.':'נכנסים, בודקים את ההכנה ומתחילים.'}</p>
    <button className="primary" onClick={()=>enter(current)}>{inProgress?'המשך הפגישה':'הכנה וכניסה לפגישה'}</button>
    <span>פרטי הלקוח, הנושאים וההחלטות במקום אחד</span>
   </div>
  </div>
  {meetings.length>1&&<div className="meeting-launch-more"><span>עוד פגישות פתוחות</span>{meetings.slice(1,3).map(m=><button className="ghost" key={m.id} onClick={()=>enter(m)}><strong>{w.families.find(f=>f.id===m.family_id)?.name||'פגישה עם המשפחה'}</strong><small>{m.status==='in_progress'?'בתהליך · ':''}{meetingDate(m)}</small></button>)}{meetings.length>3&&<button className="text-button" onClick={()=>open({page:'meetings'})}>לכל הפגישות ({meetings.length})</button>}</div>}
 </section>;
}
