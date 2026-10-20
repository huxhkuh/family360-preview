import type {Meeting,Workspace} from '../lib/model';

type LaunchWorkspace=Pick<Workspace,'profile'|'permissions'|'meetings'>;

export function canLaunchMeetings(w:LaunchWorkspace){
 return ['admin','representative'].includes(w.profile.role)&&
  (w.permissions.includes('*')||w.permissions.includes('families.edit'));
}

function scheduledTime(meeting:Meeting){
 const value=meeting.scheduled_at?Date.parse(meeting.scheduled_at):NaN;
 return Number.isFinite(value)?value:Number.POSITIVE_INFINITY;
}

// Resume an open conversation first; otherwise handle the earliest scheduled call.
// Work with a copy so displaying the shortcut never reorders the shared workspace.
export function meetingLaunches(w:LaunchWorkspace){
 if(!canLaunchMeetings(w))return [];
 return w.meetings.filter(m=>['in_progress','scheduled'].includes(m.status)).sort((a,b)=>
  Number(b.status==='in_progress')-Number(a.status==='in_progress')||
  scheduledTime(a)-scheduledTime(b)||a.id.localeCompare(b.id));
}
