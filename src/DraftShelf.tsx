import type {Workspace} from './lib/model';
import {useWorkingDrafts} from './lib/draft-guard';
import type {RouteState} from './lib/navigation';
export function DraftShelf({open,w}:{open:(route:RouteState)=>void;w:Workspace}){
 const store=useWorkingDrafts();const pending=store.pending();
 if(!pending.length)return null;
 const resume=(key:string)=>{
  const [kind,record,item]=key.split(':');
  if(kind==='admin'){store.set('admin-tab',{value:record,dirty:false,label:''});store.set('admin-selection:'+record,{value:item,dirty:false,label:''});open({page:'admin'});}
  else if(kind==='analysis')open({page:'tasks',kind:'analysis',id:record});
  else if(kind==='execution'){store.set('execution-view:'+record,{value:item==='complete'?'complete':'update',dirty:false,label:''});open({page:'tasks',kind:'execution',id:record});}
  else if(kind==='resource'){const work=store.get(key)?.value as {saved:Record<string,unknown>;revision:number};store.set('resource-open:true',{value:record==='new'?'new':{...work.saved,id:record,revision:work.revision,verified_at:null},dirty:false,label:''});store.set('admin-tab',{value:'resources',dirty:false,label:''});open({page:'admin'});}
  else if(kind==='decision')open({page:'meetings',id:record,stage:'discussion',topic:item});
  else if(kind==='checklist'){store.set('checklist-selection:'+record,{value:item,dirty:false,label:''});open({page:'meetings',id:record,stage:'checklist'});}
  else if(kind==='followup-editor'){store.set('followup-open:'+record+':false',{value:item==='new'?'new':w.followUps.find(t=>t.id===item)||null,dirty:false,label:''});open({page:'meetings',id:record,stage:'summary'});}
  else if(kind==='followup-quick')open({page:'followups',filter:'all'});
  else {if(kind==='family-task')store.set('family-activity-open:'+record+':tasks',{value:item==='new'?'new':w.familyTasks.find(t=>t.id===item)||null,dirty:false,label:''});if(kind==='family-contact')store.set('family-activity-open:'+record+':contacts',{value:'contact',dirty:false,label:''});open({page:'families',id:record,tab:kind==='questionnaire'?'questionnaire':kind==='family-task'?'followups':'overview'});}
 };
 return <details className="draft-shelf"><summary>{pending.length} טיוטות בעבודה</summary><div><p>הטיוטות נשמרות בזיכרון בזמן המעבר בין מסכים. הן אינן עדכון בתיק ויימחקו ברענון או ביציאה מהדמו.</p>{pending.map(d=><button key={d.key} className="ghost" onClick={e=>{resume(d.key);e.currentTarget.closest('details')?.removeAttribute('open');}}>חזרה לטיוטה — {d.label}</button>)}</div></details>;
}
