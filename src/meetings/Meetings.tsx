import {useState} from 'react';
import type {Workspace} from '../lib/model';
import {rpc} from '../lib/backend';
import {Badge,Empty,Field,Panel,SaveForm,textValue} from '../ui';
import {can} from '../families/FamilyView';
import {Icon} from '../icons';
import {MeetingSession} from './MeetingSession';
import {meetingProgress} from './meeting-flow';

export function Meetings({w,refresh,familyId='',clearFilter,onDirtyChange,leave,openFamily,selected,onSelect,back,stage,topic,onView}:{w:Workspace;refresh:()=>Promise<void>;familyId?:string;clearFilter:()=>void;onDirtyChange:(dirty:boolean)=>void;leave:()=>boolean;openFamily:(id:string,target?:import('../lib/workflow').Destination)=>void;selected:string;onSelect:(id:string)=>void;back:()=>void;stage?:string;topic?:string;onView:(patch:{stage?:string;topic?:string})=>void}){
 const edit=can(w,'families.edit');
 const meetings=w.meetings.filter(m=>!familyId||m.family_id===familyId).sort((a,b)=>(b.scheduled_at||'').localeCompare(a.scheduled_at||''));
 const selectedMeeting=meetings.find(m=>m.id===selected);
 const eligible=w.families.filter(f=>(!familyId||f.id===familyId)&&w.familyServices.some(s=>s.family_id===f.id&&s.status==='approved_analysis')&&!w.meetings.some(m=>m.family_id===f.id&&['scheduled','in_progress'].includes(m.status)));
 if(selectedMeeting)return <MeetingSession openFamily={openFamily} key={selectedMeeting.id} meeting={selectedMeeting} w={w} edit={edit} refresh={refresh} onDirtyChange={onDirtyChange} leave={leave} back={back} stage={stage} topic={topic} onView={onView}/>;
 return <><header className="page-title"><div><p className="eyebrow">מהממצאים להחלטות</p><h1>פגישות והחלטות</h1><p className="lead">{edit?'מכינים את השיחה, עוברים על כל נושא ומסיימים עם צעדים ברורים.':'המועדים, הנושאים וההחלטות שנשמרו בשיחות עם הנציג.'}</p></div></header>
 {familyId&&<p className="filter-notice">השיחות של {w.families.find(f=>f.id===familyId)?.name}<button className="text-button" onClick={()=>{if(leave())clearFilter();}}>לכל הפגישות</button></p>}
 <div className="meeting-list">{meetings.map(m=>{const progress=meetingProgress(w.meetingItems.filter(i=>i.meeting_id===m.id));return <article className="card" key={m.id}><div className="section-heading"><h2><button className="text-button" onClick={()=>openFamily(m.family_id)}>{w.families.find(f=>f.id===m.family_id)?.name||'לתיק המשפחה'}</button></h2><Badge status={m.status}/></div><p className="muted"><Icon name="meetings"/> {m.scheduled_at?new Date(m.scheduled_at).toLocaleString('he-IL',{dateStyle:'medium',timeStyle:'short'}):'טרם נקבע מועד'}</p><p className="muted">נציג מטפל: {w.representatives.find(r=>r.id===w.families.find(f=>f.id===m.family_id)?.representative_id)?.name||(w.profile.role==='client'?'הנציג המטפל בתיק':'לא זמין')}</p><p>{progress.decided} מתוך {progress.total} נושאים גלויים עם החלטה</p><button className="primary" onClick={()=>{if(leave())onSelect(m.id);}}>{m.status==='completed'?'לסיכום השיחה':edit?'פתיחת סביבת השיחה':'לפרטי השיחה'}<Icon name="arrow"/></button></article>;})}</div>
 {!meetings.length&&<Empty>{edit?'עדיין אין פגישות ברשימה. אפשר לתאם שיחה לאחר אישור הממצאים בתיק.':'עדיין לא נקבעה שיחה. הנציג יתאם איתכם מועד כשהבדיקה תתקדם.'}</Empty>}
 {edit&&eligible.length>0&&<Panel title="תכנון פגישה"><p className="muted">אפשר לבחור משפחה עם ממצאים שאושרו ובלי שיחה פתוחה.</p><SaveForm label="קביעת פגישה" save={async d=>{await rpc('rpc_schedule_meeting',{p_family_id:textValue(d,'family'),p_scheduled_at:new Date(textValue(d,'date')).toISOString(),p_type:textValue(d,'type')});await refresh();}}><div className="fields"><Field label="משפחה"><select name="family" required defaultValue={familyId}><option value="">בחרו…</option>{eligible.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></Field><Field label="תאריך ושעה"><input name="date" type="datetime-local" required/></Field><Field label="סוג פגישה"><select name="type"><option value="inperson">פרונטלית</option><option value="video">וידאו</option><option value="phone">טלפון</option></select></Field></div></SaveForm></Panel>}
 </>;
}
