import type {MeetingItem} from '../lib/model';
export const decisionOptions=[['undecided','טרם התקבלה החלטה'],['progress','להתקדם לביצוע'],['thinking','נדרשת מחשבה'],['declined','לא להתקדם'],['no_action','אין צורך בפעולה']];
export function decisionNext(decision:string|null,audience:'staff'|'client'='staff'){
 if(audience==='client'){
  if(decision==='progress')return 'הנציג יתאם עם בעל מקצוע את ביצוע הפעולה שאישרתם.';
  if(decision==='thinking')return 'קחו זמן לשקול את האפשרויות ועדכנו את הנציג כשתהיו מוכנים להחליט.';
  if(!decision||decision==='undecided')return 'הנושא עדיין פתוח. בשיחה עם הנציג תחליטו יחד כיצד להמשיך.';
 }
 switch(decision){
  case 'progress':return 'הנציג ישייך בעל מקצוע לביצוע לאחר סיום השיחה.';
  case 'thinking':return 'המשפחה תשקול את האפשרויות והנציג יתאם איתה את המשך המעקב.';
  case 'declined':return 'הנושא לא יועבר לביצוע. אפשר לפנות לנציג אם ההחלטה משתנה.';
  case 'no_action':return 'לא נדרשת פעולת ביצוע בנושא זה.';
  default:return 'לפני סיום השיחה יש לתעד מה הוחלט עם המשפחה.';
 }
}
export function meetingProgress(items:MeetingItem[]){
 const visible=items.filter(i=>i.visible_to_client);
 const missing=visible.filter(i=>!i.client_decision||i.client_decision==='undecided');
 return {total:visible.length,decided:visible.length-missing.length,missing};
}
// Follow the agenda, then revisit earlier open topics. Internal notes do not
// become customer decisions and never block the guided conversation.
export function nextOpenTopic(items:MeetingItem[],currentId:string){
 const index=items.findIndex(item=>item.id===currentId);
 const ordered=index<0?items:[...items.slice(index+1),...items.slice(0,index)];
 return ordered.find(item=>item.visible_to_client&&(!item.client_decision||item.client_decision==='undecided'));
}
// Explicit public projection for staff preview. Server projection remains authoritative.
export function clientSummary(items:MeetingItem[]){
 return items.filter(i=>i.visible_to_client).map(({id,title,client_summary,client_decision})=>({id,title,client_summary,client_decision}));
}
