import {createContext,useEffect,useMemo} from 'react';

// Keep only dirty form identifiers in memory, never family data or credentials.
export function useDraftRegistry(){
 const registry=useMemo(()=>{
  const forms=new Set<string>();
  return {set:(id:string,dirty:boolean)=>{if(dirty)forms.add(id);else forms.delete(id);},hasChanges:()=>forms.size>0};
 },[]);
 useEffect(()=>{
  const warn=(e:BeforeUnloadEvent)=>{if(registry.hasChanges()){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[registry]);
 return registry;
}
export const DraftContext=createContext<ReturnType<typeof useDraftRegistry>|null>(null);
