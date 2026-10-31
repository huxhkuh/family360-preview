import type {Task,Workspace} from '../lib/model';

type SnapshotField={label:string;value:unknown};
export function findingsDraft(task:Task):string{
 const parts:[string,string|null|undefined][]=[['מצב קיים',task.current_situation],['חלופה או המלצה',task.recommendation],['סיכום ללקוח',task.client_summary]];
 return parts.filter(([,value])=>typeof value==='string'&&value.trim()).map(([label,value])=>`${label}:\n${value!.trim()}`).join('\n\n');
}
export function professionalPreparation(w:Workspace,task:Task){
 if(w.profile.role!=='professional'||!w.professionals.some(p=>p.id===task.professional_id&&p.profile_id===w.profile.id&&p.active&&p.profile_active))return null;
 const fields:SnapshotField[]=(task.snapshot||[]).flatMap(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return [];
  const entry=item as Record<string,unknown>;
  return typeof entry.label==='string'&&entry.label.trim()?[{label:entry.label,value:entry.value}]:[];
 });
 const missing=fields.filter(f=>f.value===null||f.value===undefined||f.value===''||(Array.isArray(f.value)&&!f.value.length));
 const documents=w.documents.filter(doc=>doc.family_id===task.family_id);
 return {fields,missing,documents,returnReason:task.status==='returned'?task.return_history?.at(-1)?.reason:undefined,
  hasFindings:!!(task.current_situation||task.recommendation||task.client_summary||task.findings?.length)};
}
