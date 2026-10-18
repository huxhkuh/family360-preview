import {useEffect,useRef,useState} from 'react';
import {readRoute,routeHash,type RouteState} from './navigation';

// The history contains route IDs, filters and scroll position, never record data.
export function useNavigation(leave:()=>boolean){
 const [route,setRoute]=useState(()=>readRoute(location.hash));
 const current=useRef({hash:location.hash,index:Number(history.state?.f360?.index)||0});
 const leaveRef=useRef(leave);leaveRef.current=leave;
 const restoring=useRef(false);const bypass=useRef(false);
 useEffect(()=>{
  history.replaceState({...history.state,f360:{index:current.current.index,scroll:history.state?.f360?.scroll||0}},'');
  const oldRestoration=history.scrollRestoration;history.scrollRestoration='manual';
  const changed=()=>{
   if(restoring.current){restoring.current=false;return;}
   if(location.hash===current.current.hash)return;
   const index=Number(history.state?.f360?.index)||0;
   if(!bypass.current&&!leaveRef.current()){
    const delta=current.current.index-index;
    if(delta){restoring.current=true;history.go(delta);}else history.replaceState({...history.state,f360:{index:current.current.index}},'',current.current.hash||location.pathname+location.search);
    return;
   }
   bypass.current=false;current.current={hash:location.hash,index};setRoute(readRoute(location.hash));
   const scroll=history.state?.f360?.scroll||0;requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,scroll)));
  };
  const remember=()=>history.replaceState({...history.state,f360:{index:current.current.index,scroll:window.scrollY}},'');
  window.addEventListener('popstate',changed);window.addEventListener('scroll',remember,{passive:true});
  return()=>{window.removeEventListener('popstate',changed);window.removeEventListener('scroll',remember);history.scrollRestoration=oldRestoration;};
 },[]);
 function go(next:RouteState,{replace=false,guard=true,scroll=true}={}){
  const hash=routeHash(next);if(hash===current.current.hash)return false;
  if(guard&&!leaveRef.current())return false;
  history.replaceState({...history.state,f360:{index:current.current.index,scroll:window.scrollY}},'');
  const index=current.current.index+(replace?0:1);
  history[replace?'replaceState':'pushState']({f360:{index,scroll:scroll?0:window.scrollY}},'',hash);
  current.current={hash,index};setRoute(next);if(scroll)requestAnimationFrame(()=>window.scrollTo(0,0));return true;
 }
 function back(fallback:RouteState){
  if(!leaveRef.current())return;
  if(current.current.index>0){bypass.current=true;history.back();}else go(fallback,{replace:true,guard:false});
 }
 return {route,go,back,query:(patch:Partial<RouteState>)=>go({...route,...patch},{replace:true,guard:false,scroll:false})};
}
