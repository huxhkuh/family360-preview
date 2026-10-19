import {useEffect,useRef,useState} from 'react';
import {readRoute,routeHash,type RouteState} from './navigation';

// The history contains route IDs, filters and scroll position, never record data.
export function useNavigation(leave:()=>boolean){
 const [route,setRoute]=useState(()=>readRoute(location.hash));
 const current=useRef({hash:location.hash,index:Number(history.state?.f360?.index)||0});
 const leaveRef=useRef(leave);leaveRef.current=leave;
 const lists=useRef(new Map<string,RouteState>());const positions=useRef(new Map<string,number>());
 const scrollAttempt=useRef(0);
 const restoreScroll=(y:number)=>{const attempt=++scrollAttempt.current;const deadline=performance.now()+1600;const apply=()=>{if(scrollAttempt.current!==attempt)return;if(document.documentElement.scrollHeight>=y+innerHeight||performance.now()>deadline){const focus=readRoute(location.hash).focus;const target=focus?Array.from(document.querySelectorAll<HTMLElement>('[data-record-id]')).find(el=>el.dataset.recordId===focus):undefined;if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'center'});}else window.scrollTo(0,y);return;}requestAnimationFrame(apply);};requestAnimationFrame(()=>requestAnimationFrame(apply));};
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
   const scroll=history.state?.f360?.scroll||0;restoreScroll(scroll);
  };
  const remember=()=>{positions.current.set(current.current.hash,window.scrollY);history.replaceState({...history.state,f360:{index:current.current.index,scroll:window.scrollY}},'');};
  const cancelScroll=()=>{scrollAttempt.current++;};window.addEventListener('wheel',cancelScroll,{passive:true});window.addEventListener('touchstart',cancelScroll,{passive:true});
  window.addEventListener('popstate',changed);window.addEventListener('scroll',remember,{passive:true});
  return()=>{scrollAttempt.current++;window.removeEventListener('wheel',cancelScroll);window.removeEventListener('touchstart',cancelScroll);window.removeEventListener('popstate',changed);window.removeEventListener('scroll',remember);history.scrollRestoration=oldRestoration;};
 },[]);
 function go(next:RouteState,{replace=false,guard=true,scroll=true}={}){
  const previous=readRoute(current.current.hash);if(!previous.id)lists.current.set(previous.page,previous);
  positions.current.set(current.current.hash,window.scrollY);
  if(Object.keys(next).length===1&&lists.current.has(next.page))next=lists.current.get(next.page)!;
  const hash=routeHash(next);if(hash===current.current.hash)return false;
  if(guard&&!leaveRef.current())return false;
  history.replaceState({...history.state,f360:{index:current.current.index,scroll:window.scrollY}},'');
  const index=current.current.index+(replace?0:1);const destinationScroll=scroll?(positions.current.get(hash)||0):window.scrollY;
  history[replace?'replaceState':'pushState']({f360:{index,scroll:destinationScroll}},'',hash);
  current.current={hash,index};setRoute(next);if(scroll)restoreScroll(destinationScroll);return true;
 }
 function back(fallback:RouteState){
  if(!leaveRef.current())return;
  if(current.current.index>0){bypass.current=true;history.back();}else go(fallback,{replace:true,guard:false});
 }
 return {route,go,back,query:(patch:Partial<RouteState>)=>go({...route,...patch},{replace:true,guard:false,scroll:false})};
}
