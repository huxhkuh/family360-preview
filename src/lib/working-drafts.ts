// Session memory only. No browser storage, network writes or cross-account reuse.
export type WorkingDraft={value:unknown;dirty:boolean;label:string};
export function createWorkingDrafts(){
 const entries=new Map<string,WorkingDraft>();const listeners=new Set<()=>void>();let version=0;
 const changed=()=>{version++;listeners.forEach(fn=>fn());};
 return {
  get:(key:string)=>entries.get(key),
  set:(key:string,entry:WorkingDraft)=>{entries.set(key,entry);changed();},
  remove:(key:string)=>{if(entries.delete(key))changed();},
  clear:()=>{entries.clear();changed();},
  pending:(prefix='')=>[...entries].filter(([key,entry])=>key.startsWith(prefix)&&entry.dirty).map(([key,entry])=>({key,label:entry.label})),
  subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},
  version:()=>version,
 };
}
