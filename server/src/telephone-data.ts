import {familyAccess,type Actor} from './auth';
import {Database,requireThat} from './db';
import {statusLabels} from '../../src/lib/core';

export type TelephoneInformation = {status:string; tasks:string[]; documents:string[]; meetings:string[]; updates:string[]};
const clean=(value:string)=>value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,500);
const date=(value:string|null|undefined)=>{
 if(!value)return '';
 const parsed=new Date(value.length===10?`${value}T12:00:00Z`:value);
 return Number.isNaN(parsed.valueOf())?'':new Intl.DateTimeFormat('he-IL',{timeZone:'Asia/Jerusalem',dateStyle:'short',...(value.length>10?{timeStyle:'short'}:{})}).format(parsed);
};
const label=(status:string)=>statusLabels[status]||'לפרטים נוספים אפשר לפנות לנציג';
const limit=(values:string[],empty:string)=>values.length?[...values.slice(0,20),...(values.length>20?['יש פריטים נוספים. אפשר לפנות לנציג לפרטים.']:[])]:[empty];

/** Call only after telephone verification. Apply the same visibility rules as the client workspace. */
export async function telephoneData(db:Database,actor:Actor,familyId:string):Promise<TelephoneInformation>{
 const profile=await db.required('profiles',actor.profile.id);
 requireThat(profile.active&&profile.role==='client'&&actor.profile.role==='client');
 const family=await familyAccess(db,{...actor,profile},familyId);
 const [familyTasks,followUps,items,docs,scheduled,notifications]=await Promise.all([
  db.rows('family_tasks',"family_id=? AND visible_to_client=1 AND status IN ('open','in_progress')",[familyId]),
  db.rows('meeting_followups',"family_id=? AND visible_to_client=1 AND status IN ('open','in_progress')",[familyId]),
  db.rows('meeting_items','family_id=? AND visible_to_client=1',[familyId]),
  db.rows('documents',"family_id=? AND status IN ('missing','rejected')",[familyId]),
  db.rows('meetings',"family_id=? AND status IN ('scheduled','in_progress')",[familyId]),
  db.rows('notifications','profile_id=? AND family_id=?',[profile.id,familyId],'ORDER BY created_at DESC LIMIT 100')
 ]);
 const visibleItems=new Set(items.map(i=>i.id));
 const tasks=[...familyTasks,...followUps.filter(t=>!t.item_id||visibleItems.has(t.item_id))].map(t=>`${clean(t.title)}. ${t.owner_role==='client'?'באחריות המשפחה':'באחריות הנציג'}.${date(t.due_on)?' מועד: '+date(t.due_on)+'.':''}`);
 const documents=docs.map(d=>`${clean(d.name)}. ${d.status==='missing'?'חסר':'נדרש תיקון'}.`);
 const meetings=scheduled.map(m=>`פגישה ${label(m.status)}.${date(m.scheduled_at)?' מועד: '+date(m.scheduled_at)+'.':''}`);
 const updates=notifications.map(n=>`${clean(n.title)}.${n.body?' '+clean(n.body):''}`);
 return {status:`מצב הטיפול בתיק: ${label(family.status)}.`,tasks:limit(tasks,'אין כרגע משימות פתוחות.'),documents:limit(documents,'אין כרגע מסמכים חסרים או מסמכים הדורשים תיקון.'),meetings:limit(meetings,'אין כרגע פגישות מתוכננות.'),updates:limit(updates,'אין כרגע עדכונים נוספים.')};
}
