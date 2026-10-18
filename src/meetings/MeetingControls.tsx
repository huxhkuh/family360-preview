import {useEffect,useRef,useState} from 'react';
import type {Meeting} from '../lib/model';
import {rpc} from '../lib/backend';
import {Field,SaveForm,textValue} from '../ui';
function localInput(iso:string|null){if(!iso)return '';const date=new Date(iso);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export function MeetingControls({meeting,refresh,leave}:{meeting:Meeting;refresh:()=>Promise<void>;leave:()=>boolean}){
 const [action,setAction]=useState('');const [notice,setNotice]=useState('');const [expectedAt,setExpectedAt]=useState(meeting.scheduled_at);const noticeRef=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(notice)noticeRef.current?.focus();},[notice]);
 const begin=(next:string)=>{if(action!==next&&leave()){setExpectedAt(meeting.scheduled_at);setNotice('');setAction(next);}};
 return <section aria-label="ניהול מועד הפגישה">{notice&&<p className="success" role="status" ref={noticeRef} tabIndex={-1}>{notice}</p>}{meeting.status==='scheduled'&&<><div className="followup-actions"><button onClick={()=>{begin('reschedule');}}>שינוי מועד</button><button className="ghost" onClick={()=>{begin('cancel');}}>ביטול הפגישה</button></div>{action&&<div className="card"><h2>{action==='reschedule'?'שינוי מועד הפגישה':'ביטול הפגישה המתוכננת'}</h2><p>{action==='reschedule'?'התאריך יתעדכן, והנושאים שהוכנו לשיחה יישמרו.':'הפגישה תסומן כמבוטלת והתיק יחזור לתכנון שיחה. הממצאים יישמרו ויהיה אפשר לתאם פגישה חדשה.'} יש לעדכן את המשפחה בנפרד; פעולה זו אינה שולחת הודעה.</p><SaveForm key={action} label={action==='reschedule'?'שמירת המועד החדש':'אישור ביטול הפגישה'} save={async d=>{
  await rpc('rpc_manage_meeting',{p_meeting_id:meeting.id,p_action:action,p_expected_scheduled_at:expectedAt,p_scheduled_at:action==='reschedule'?new Date(textValue(d,'date')).toISOString():null,p_reason:action==='cancel'?textValue(d,'reason'):null});
  await refresh();setNotice(action==='reschedule'?'מועד הפגישה עודכן. יש לתאם את השינוי עם המשפחה.':'הפגישה בוטלה. אפשר לתכנן פגישה חדשה מתוך התיק.');setAction('');
 }}>{action==='reschedule'?<Field label="המועד החדש"><input name="date" type="datetime-local" required defaultValue={localInput(expectedAt)}/></Field>:<Field label="סיבת הביטול"><textarea name="reason" minLength={3} maxLength={2000} required/></Field>}</SaveForm><button className="ghost" onClick={()=>{if(leave())setAction('');}}>סגירה ללא שינוי</button></div>}</>}</section>;
}
