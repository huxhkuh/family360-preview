import {createContext,useContext,useEffect,useMemo,useState,useSyncExternalStore,type SetStateAction} from 'react';
import {createWorkingDrafts} from './working-drafts';

// Unretained forms still ask before leaving. Retained drafts survive navigation
// in this mounted account only, and warn before closing/reloading the browser.
export function useDraftRegistry(){
 const registry=useMemo(()=>{
  const forms=new Set<string>();
  return {working:createWorkingDrafts(),set:(id:string,dirty:boolean)=>{if(dirty)forms.add(id);else forms.delete(id);},hasChanges:()=>forms.size>0};
 },[]);
 useEffect(()=>{
  const warn=(e:BeforeUnloadEvent)=>{if(registry.hasChanges()||registry.working.pending().length){e.preventDefault();e.returnValue='';}};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[registry]);
 return registry;
}
export const DraftContext=createContext<ReturnType<typeof useDraftRegistry>|null>(null);

export function useWorkingDrafts(){
 const context=useContext(DraftContext);const [fallback]=useState(createWorkingDrafts);const store=context?.working||fallback;
 useSyncExternalStore(store.subscribe,store.version,store.version);return store;
}
export function useRetainedState<T>(key:string,initial:()=>T,isDirty:(value:T)=>boolean=()=>false,label='טיוטה'):[T,(value:SetStateAction<T>)=>void]{
 const store=useWorkingDrafts();const [fallback]=useState(initial);
 const value=(store.get(key)?.value as T|undefined)??fallback;
 const set=(next:SetStateAction<T>)=>{const current=(store.get(key)?.value as T|undefined)??fallback;const result=typeof next==='function'?(next as (v:T)=>T)(current):next;store.set(key,{value:result,dirty:isDirty(result),label});};
 return [value,set];
}
