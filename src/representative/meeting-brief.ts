import type {Workspace} from '../lib/model';
import {buildQuestionnaireCoverage} from '../reports/questionnaire-coverage';
import {canLaunchMeetings} from '../meetings/meeting-launch';

export function meetingBrief(w:Workspace, familyId:string){
 if(!canLaunchMeetings(w))return null;
 const family=w.families.find(f=>f.id===familyId);
 if(!family)return null;
 const coverage=buildQuestionnaireCoverage(family.answers||{},[],w.services);
 const items=coverage.filter(c=>c.shown).flatMap(c=>c.items.map(i=>({...i,chapter:c.title})));
 const hasValue=(v:string)=>!v.startsWith('לא נמסר')&&!v.startsWith('לא נמסרו')&&!v.startsWith('נתון במבנה')&&!v.split(' · ').some(part=>part==='נדרש בירור לגבי מבנה הנתון'||part==='ערך קודם שנדרש לברר');
 const answered=items.filter(i=>hasValue(i.value));
 const missing=items.filter(i=>!hasValue(i.value));
 const documents=w.documents.filter(d=>d.family_id===familyId&&['missing','rejected'].includes(d.status));
 const openTasks=[...w.familyTasks,...w.followUps].filter(t=>t.family_id===familyId&&['open','in_progress'].includes(t.status));
 return {family,answered,missing,documents,openTasks};
}


