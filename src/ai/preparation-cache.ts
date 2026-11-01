import type {Workspace} from '../lib/model';
import type {AiJob,AiBrief} from './contracts';
const cached=new Map<string,{stamp:string;job:AiJob}>();
const key=(w:Workspace,id:string)=>w.profile.id+':'+id;
export function preparationStamp(w:Workspace,id:string){return JSON.stringify({answers:w.families.find(f=>f.id===id)?.answers,documents:w.documents.filter(d=>d.family_id===id).map(d=>[d.id,d.storage_path,d.file_name,d.status]),findings:w.analysisTasks.filter(t=>t.family_id===id).map(t=>[t.id,t.status,t.current_situation,t.recommendation,t.client_summary])});}
export function cachePreparation(w:Workspace,id:string,job:AiJob|null){if(job?.status==='ready')cached.set(key(w,id),{stamp:preparationStamp(w,id),job});else cached.delete(key(w,id));}
export function preparedTopic(w:Workspace,id:string,topic:string){const entry=cached.get(key(w,id));if(!entry||entry.stamp!==preparationStamp(w,id))return null;const data=entry.job.result as AiBrief;const item=data.topics.find(t=>t.key===topic);return item?{...item,sources:entry.job.sources,createdAt:entry.job.created_at}:null;}
export function invalidatePreparation(){cached.clear();}
