import type {Workspace} from './model';
import type {RouteState} from './navigation';

// Only offer destinations that exist in this role's already-scoped workspace.
export function notificationTarget(n:Workspace['notifications'][number],w:Workspace):RouteState|undefined{
 if(!n.family_id||!w.families.some(f=>f.id===n.family_id))return;
 if(n.target_kind==='document'&&w.documents.some(d=>d.id===n.target_id&&d.family_id===n.family_id))return {page:'families',id:n.family_id,tab:'documents',focus:n.target_id};
 if(n.target_kind==='familyTask'&&w.familyTasks.some(t=>t.id===n.target_id&&t.family_id===n.family_id&&(w.profile.role!=='client'||t.visible_to_client)))return {page:'families',id:n.family_id,tab:'followups',focus:n.target_id};
}
