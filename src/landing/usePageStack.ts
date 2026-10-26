import {useEffect,useRef,useState} from 'react';

export function usePageStack(){
 const rootRef=useRef<HTMLDivElement>(null);
 const [headerVisible,setHeaderVisible]=useState(true);
 const [headerTheme,setHeaderTheme]=useState<'dark'|'light'>('dark');
 useEffect(()=>{
  const root=rootRef.current;
  if(!root)return;
  const header=root.querySelector<HTMLElement>(':scope > .public-header');
  const panels=Array.from(root.querySelectorAll<HTMLElement>(':scope > main > section'));
  const footer=root.querySelector<HTMLElement>(':scope > footer');
  if(!header)return;
  let frame=0;
  let pointerAtTop=false;
  let touchReveal=false;
  let previousY=window.scrollY;
  const touchScreen=window.matchMedia('(hover: none)');
  const update=()=>{
   frame=0;
   if(!root.getClientRects().length)return;
   const headerHeight=header.offsetHeight;
   root.style.setProperty('--stack-header-height',`${headerHeight}px`);
   // Tall pages must scroll to their end before the next page covers them.
   panels.forEach((panel,index)=>{
    panel.style.setProperty('--page-pin-top',`${Math.min(0,innerHeight-panel.offsetHeight)}px`);
    panel.style.setProperty('--page-order',String(index+1));
   });
   setHeaderVisible(window.scrollY<40||pointerAtTop||touchReveal);
   const line=headerHeight+2;
   let theme:'dark'|'light'='dark';
   for(const panel of [...panels,...(footer?[footer]:[])]){
    if(panel.getBoundingClientRect().top<=line)theme=panel.dataset.pageTheme==='dark'?'dark':'light';
   }
   setHeaderTheme(previous=>previous===theme?previous:theme);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const onScroll=()=>{
   const delta=window.scrollY-previousY;
   if(touchScreen.matches&&Math.abs(delta)>4)touchReveal=delta<0;
   previousY=window.scrollY;
   schedule();
  };
  const onPointerMove=(event:PointerEvent)=>{
   if(event.pointerType==='touch')return;
   if(event.clientY<=24)pointerAtTop=true;
   else if(event.clientY>header.offsetHeight+24)pointerAtTop=false;
   schedule();
  };
  const onPointerLeave=()=>{pointerAtTop=false;schedule();};
  window.addEventListener('pointermove',onPointerMove,{passive:true});
  document.documentElement.addEventListener('pointerleave',onPointerLeave);
  const observer=new ResizeObserver(schedule);
  [root,header,...panels].forEach(element=>observer.observe(element));
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  schedule();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',onScroll);window.removeEventListener('pointermove',onPointerMove);document.documentElement.removeEventListener('pointerleave',onPointerLeave);window.removeEventListener('resize',schedule);};
 },[]);
 return {rootRef,headerTheme,headerVisible};
}

export function scrollToPage(root:HTMLElement,target:HTMLElement){
 const main=root.querySelector<HTMLElement>(':scope > main');
 const panels=main?Array.from(main.children).filter((element):element is HTMLElement=>element instanceof HTMLElement):[];
 const index=panels.indexOf(target);
 if(main&&index>=0){
  const precedingHeight=panels.slice(0,index).reduce((height,panel)=>height+panel.offsetHeight,0);
  window.scrollTo({top:main.getBoundingClientRect().top+window.scrollY+precedingHeight,behavior:'instant'});
 }else target.scrollIntoView({block:'start',behavior:'instant'});
}
