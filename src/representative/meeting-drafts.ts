import type {Workspace} from '../lib/model';
import {canLaunchMeetings} from '../meetings/meeting-launch';

export function draftOptions(w:Workspace,familyId:string){
 if(!canLaunchMeetings(w))return null;
 const family=w.families.find(f=>f.id===familyId);
 if(!family)return null;
 const documents=w.documents.filter(d=>d.family_id===familyId&&!d.optional&&['missing','rejected'].includes(d.status));
 const selectedIds=new Set(w.familyServices.filter(s=>s.family_id===familyId).map(s=>s.service_id));
 const services=w.services.filter(s=>selectedIds.has(s.id));
 return {family,documents,services};
}
export function clientDraft(w:Workspace,familyId:string,documentId:string){
 const data=draftOptions(w,familyId);if(!data)return null;
 const doc=data.documents.find(d=>d.id===documentId);if(!doc)return null;
 const action=doc.status==='rejected'?'נדרש לתקן את המסמך':'חסר לנו המסמך';
 return `שלום,\n${action}: ${doc.name}. נשמח לעזור בבירור ובצעדים להשלמה.\nתודה`;
}
export function professionalDraft(w:Workspace,familyId:string,serviceId:string){
 const data=draftOptions(w,familyId);if(!data)return null;
 const service=data.services.find(s=>s.id===serviceId);if(!service)return null;
 return `שלום,\nנא לבדוק את תחום ${service.name} בתיק ${data.family.case_number}.\nנשמח לקבל ממצאים והמשך טיפול לאחר הבדיקה.\nתודה`;
}
