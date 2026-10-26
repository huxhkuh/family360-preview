import {useEffect,useRef,useState} from 'react';
import {gazeDirection,gazeDirections,type GazeDirection} from './gaze';
import './hero-gaze.css';
const original=import.meta.env.BASE_URL+'homepage/welcome.png';
const frames=Object.fromEntries(gazeDirections.map(direction=>[direction,import.meta.env.BASE_URL+'companion/gaze/'+direction+'.webp'])) as Record<Exclude<GazeDirection,'neutral'>,string>;
export function HeroGaze(){
 const host=useRef<HTMLSpanElement>(null);
 const [ready,setReady]=useState(false),[enabled,setEnabled]=useState(false),[direction,setDirection]=useState<GazeDirection>('neutral');
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const fine=matchMedia('(pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let alive=true,visible=false,loaded=false,loading=false,listening=false,frame=0,lastTime=0,lastSwitch=0;
  let targetX=0,targetY=0,x=0,y=0,current:GazeDirection='neutral';
  const neutral=()=>{targetX=0;targetY=0;x=0;y=0;current='neutral';lastSwitch=performance.now();setDirection('neutral');cancelAnimationFrame(frame);frame=0;};
  const tick=(time:number)=>{
   frame=0;const elapsed=Math.min(50,lastTime?time-lastTime:16);lastTime=time;
   const weight=1-Math.exp(-elapsed/70);x+=(targetX-x)*weight;y+=(targetY-y)*weight;
   const next=gazeDirection(x,y,current);if(next!==current&&time-lastSwitch>=135){current=next;lastSwitch=time;setDirection(next);}
   if(Math.abs(targetX-x)+Math.abs(targetY-y)>.5||next!==current)frame=requestAnimationFrame(tick);
  };
  const move=(event:PointerEvent)=>{
   if(event.pointerType!=='mouse'||!listening)return;
   const rect=element.getBoundingClientRect();
   // The face is above and left of the artwork canvas centre, in physical screen coordinates.
   targetX=event.clientX-(rect.left+rect.width*.475);targetY=event.clientY-(rect.top+rect.height*.16);
   if(!frame){lastTime=0;frame=requestAnimationFrame(tick);}
  };
  const update=()=>{
   const active=visible&&loaded&&fine.matches&&!reduced.matches&&document.visibilityState==='visible';
   setEnabled(active);
   if(active&&!listening){listening=true;window.addEventListener('pointermove',move,{passive:true});document.documentElement.addEventListener('pointerleave',neutral);window.addEventListener('blur',neutral);}
   if(!active&&listening){listening=false;window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',neutral);window.removeEventListener('blur',neutral);neutral();}
   if(visible&&fine.matches&&!reduced.matches&&!loading){
    loading=true;
    void Promise.all(Object.values(frames).map(src=>{const image=new Image();image.src=src;return image.decode();})).then(()=>{if(alive){loaded=true;setReady(true);update();}}).catch(()=>{/* Keep the complete original illustration if any directional asset fails. */});
   }
  };
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;update();},{threshold:0});observer.observe(element);
  fine.addEventListener('change',update);reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  return()=>{alive=false;observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('pointerleave',neutral);window.removeEventListener('blur',neutral);fine.removeEventListener('change',update);reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 return <span ref={host} className="hero-gaze" data-direction={direction} data-ready={ready} data-enabled={enabled}>
  <img className="gaze-body" src={original} alt="" draggable={false} fetchPriority="high"/>
  {ready&&<span className="gaze-heads"><img className="gaze-head" data-pose="neutral" data-current={direction==='neutral'} src={original} alt="" draggable={false}/>{gazeDirections.map(pose=><img className="gaze-head" key={pose} data-pose={pose} data-current={direction===pose} src={frames[pose]} alt="" draggable={false}/>)}</span>}
 </span>;
}
