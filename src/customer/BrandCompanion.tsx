import {useEffect,useRef} from 'react';
import {CompanionPortrait,type Pose} from '../companion/Companion';
export function BrandCompanion({pose='welcome',full=false}:{pose?:Pose;full?:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!matchMedia('(pointer:fine)').matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  let frame=0,x=0,y=0;
  const update=()=>{frame=0;ref.current?.style.setProperty('--look-x',`${x}px`);ref.current?.style.setProperty('--look-y',`${y}px`);ref.current?.style.setProperty('--look-turn',`${x*.2}deg`);};
  const move=(event:PointerEvent)=>{x=Math.max(-9,Math.min(9,(event.clientX-innerWidth/2)/80));y=Math.max(-5,Math.min(5,(event.clientY-innerHeight/2)/100));if(!frame)frame=requestAnimationFrame(update);};
  const reset=()=>{x=0;y=0;if(!frame)frame=requestAnimationFrame(update);};
  window.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',reset);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',reset);};
 },[]);
 return <div ref={ref} className={`brand-companion${full?' brand-companion-full':''}`} aria-hidden="true"><div className="brand-companion-scene"><span className="brand-petal petal-one"/><span className="brand-petal petal-two"/><span className="brand-petal petal-three"/><span className="brand-companion-person">{full?<img src={`${import.meta.env.BASE_URL}homepage/welcome.png`} alt="" draggable={false}/>:<CompanionPortrait pose={pose}/>}</span><span className="brand-companion-ground"/></div></div>;
}
