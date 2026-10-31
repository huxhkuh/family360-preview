import type {Workspace} from '../lib/model';
import {isLate,workQueue} from '../lib/work-queue';

/** Counts only records present in the caller's authorized workspace. */
export function workloadSummary(w:Workspace,now=new Date()){
 if(w.profile.role!=='admin')return null;
 const rows=workQueue(w,now),familyIds=new Set(w.families.map(f=>f.id));
 const unique=(ids:string[])=>new Set(ids).size;
 const documents=w.documents.filter(d=>familyIds.has(d.family_id)&&!d.optional&&['missing','rejected'].includes(d.status));
 const representatives=w.representatives.filter(rep=>rep.active).map(rep=>{
  const ids=new Set(w.families.filter(f=>f.representative_id===rep.id).map(f=>f.id));
  return {id:rep.id,name:rep.name,items:rows.filter(row=>ids.has(row.familyId)&&!row.waiting).length};
 }).filter(rep=>rep.items>0).sort((a,b)=>b.items-a.items||a.name.localeCompare(b.name,'he'));
 return {
  families:w.families.length,
  waiting:unique(rows.filter(row=>row.waiting).map(row=>row.familyId)),
  overdue:unique(rows.filter(row=>isLate(row,now)).map(row=>row.familyId)),
  missingDocuments:unique(documents.map(doc=>doc.family_id)),
  documentCount:documents.length,
  representatives,
  limited:w.familiesTruncated||w.followUpsTruncated||w.familyWorkTruncated,
 };
}
