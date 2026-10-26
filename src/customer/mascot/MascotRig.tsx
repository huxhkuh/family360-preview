import {useEffect,useId,useRef,useState} from 'react';
import {MascotMotion,normalizedGaze,type RigPose} from './motion';
import {eyeContour,rigArtwork as art} from './artwork';

const base=`${import.meta.env.BASE_URL}companion/rig/`;
const assets=[['master.png',1254,1254],['head.png',280,390],['neck.png',200,115],['sclera.png',130,60],['lids.png',130,60],['iris-left.png',24,24],['iris-right.png',28,28]] as const;
const neutral:RigPose={eyes:{x:0,y:0},head:{x:0,y:0},headRoll:0,eyeOpen:1};

function decodeAssets(){
 return Promise.all(assets.map(([name,width,height])=>new Promise<void>((resolve,reject)=>{
  const image=new Image();image.src=base+name;
  image.decode().then(()=>image.naturalWidth===width&&image.naturalHeight===height?resolve():reject(new Error(`Invalid rig asset: ${name}`)),reject);
 })));
}

/** An isolated renderer: the body never receives a transform. No React frame updates. */
export function MascotRig({previewPose,inspectFace=false}:{previewPose?:RigPose;inspectFace?:boolean}={}){
 const id=useId().replace(/:/g,'');
 const root=useRef<HTMLSpanElement>(null),svg=useRef<SVGSVGElement>(null),head=useRef<SVGGElement>(null);
 const pupils=useRef<(SVGGElement|null)[]>([]),clips=useRef<(SVGPathElement|null)[]>([]),covers=useRef<(SVGPathElement|null)[]>([]),lids=useRef<(SVGPathElement|null)[]>([]);
 const [loaded,setLoaded]=useState(false),[failed,setFailed]=useState(false),[originalFallback,setOriginalFallback]=useState(false);
 useEffect(()=>{
  let disposed=false;
  const timeout=window.setTimeout(()=>{if(!disposed)setFailed(true);},12000);
  decodeAssets().then(()=>{if(!disposed){window.clearTimeout(timeout);setLoaded(true);}},()=>{if(!disposed)setFailed(true);});
  return()=>{disposed=true;window.clearTimeout(timeout);};
 },[]);
 const ready=loaded&&!failed;
 useEffect(()=>{
  if(!ready||!root.current||!svg.current||!head.current)return;
  const element=root.current,canvas=svg.current,headLayer=head.current;
  function paint(p:RigPose){
   headLayer.setAttribute('transform',`translate(${p.head.x*art.headTravel.x} ${p.head.y*art.headTravel.y}) rotate(${p.headRoll} ${art.pivot.x} ${art.pivot.y})`);
   art.eyes.forEach((eye,i)=>{
    pupils.current[i]?.setAttribute('transform',`translate(${p.eyes.x*eye.travel.x} ${p.eyes.y*eye.travel.y})`);
    const contour=eyeContour(eye,p.eyeOpen);
    clips.current[i]?.setAttribute('d',contour.opening);lids.current[i]?.setAttribute('d',contour.top);
    covers.current[i]?.setAttribute('d',contour.cover);
    lids.current[i]?.setAttribute('stroke-width',String(1.4*Math.sin(Math.PI*p.eyeOpen)));
   });
  }
  if(previewPose){paint(previewPose);element.dataset.mode='preview';return;}
  const motion=new MascotMotion(),reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(any-hover: hover) and (any-pointer: fine)');
  let frame=0,last=0,visible=false,pointer:{x:number;y:number}|null=null;
  // Cached layout. Refresh on resize/scroll, never read layout after each frame's writes.
  let matrix:DOMMatrix|null=null,screenWidth=innerWidth,screenHeight=innerHeight;
  const measure=()=>{matrix=canvas.getScreenCTM();screenWidth=innerWidth;screenHeight=innerHeight;};
  function chooseMode(){
   const mode=reduced.matches?'reduced':!fine.matches?'idle':pointer?'pointer':'rest';
   motion.setMode(mode);element.dataset.mode=mode;
  }
  function tick(now:number){
   frame=0;
   if(!visible||document.hidden||reduced.matches)return;
   if(pointer&&matrix){
    const face=new DOMPoint(634,200).matrixTransform(matrix);
    const radius={x:Math.max(280,screenWidth*.43),y:Math.max(240,screenHeight*.46)},p=motion.pose;
    const local=new DOMPoint(pointer.x,pointer.y).matrixTransform(matrix.inverse());
    const dx=local.x-art.pivot.x-p.head.x*art.headTravel.x,dy=local.y-art.pivot.y-p.head.y*art.headTravel.y;
    const angle=-p.headRoll*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),scale=Math.hypot(matrix.a,matrix.b);
    const headLocal={x:art.pivot.x+dx*c-dy*s,y:art.pivot.y+dx*s+dy*c};
    motion.setTarget(normalizedGaze(pointer,face,radius),normalizedGaze(headLocal,{x:634,y:200},{x:radius.x/scale,y:radius.y/scale}));
   }
   paint(motion.advance(last?(now-last)/1000:1/60));last=now;
   frame=requestAnimationFrame(tick);
  }
  function sync(){
   cancelAnimationFrame(frame);frame=0;last=0;chooseMode();measure();
   if(reduced.matches){paint(neutral);return;}
   if(visible&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  const move=(e:PointerEvent)=>{if(e.pointerType==='touch'||!fine.matches)return;pointer={x:e.clientX,y:e.clientY};chooseMode();};
  const leave=()=>{pointer=null;chooseMode();};
  const out=(e:PointerEvent)=>{if(e.relatedTarget===null)leave();};
  const visibility=()=>{if(document.hidden)leave();sync();};
  const intersection=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();});intersection.observe(element);
  const resize=new ResizeObserver(measure);resize.observe(element);
  window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerout',out,{passive:true});
  window.addEventListener('blur',leave);window.addEventListener('resize',measure,{passive:true});window.addEventListener('scroll',measure,{passive:true,capture:true});
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',sync);fine.addEventListener('change',sync);
  paint(neutral);sync();
  return()=>{
   cancelAnimationFrame(frame);intersection.disconnect();resize.disconnect();
   window.removeEventListener('pointermove',move);document.removeEventListener('pointerout',out);window.removeEventListener('blur',leave);
   window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);document.removeEventListener('visibilitychange',visibility);
   reduced.removeEventListener('change',sync);fine.removeEventListener('change',sync);
  };
 },[ready,previewPose]);
 return <span ref={root} className="hero-gaze" data-rig-status={failed?'asset-error':ready?'ready':'loading'} data-enabled={ready}>
  {!ready?<img className="gaze-body" src={originalFallback?`${import.meta.env.BASE_URL}homepage/welcome.png`:`${base}master.png`} onError={()=>setOriginalFallback(true)} alt="" draggable={false} fetchPriority="high" width={1254} height={1254}/>:<svg ref={svg} viewBox={inspectFace?'470 15 300 370':'0 0 1254 1254'} aria-hidden="true" className="gaze-rig">
   <defs>
    <clipPath id={`${id}-head`}><path d={art.headCut}/></clipPath>
    <mask id={`${id}-body`} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254"><rect width="1254" height="1254" fill="white"/><path d={art.bodyCut} fill="black"/></mask>
    <clipPath id={`${id}-neck`}><path d={art.neckCut}/></clipPath>
    {art.eyes.map((eye,i)=><g key={eye.id}>
     <clipPath id={`${id}-${eye.id}-patch`}><path d={eye.patch}/></clipPath>
     <clipPath id={`${id}-${eye.id}-cover`}><path ref={el=>{covers.current[i]=el;}} d={eyeContour(eye,1).cover}/></clipPath>
     <clipPath id={`${id}-${eye.id}-open`}><path ref={el=>{clips.current[i]=el;}} d={eyeContour(eye,1).opening}/></clipPath>
     <clipPath id={`${id}-${eye.id}-iris`}><ellipse cx={eye.iris.cx} cy={eye.iris.cy} rx={eye.iris.rx} ry={eye.iris.ry}/></clipPath>
    </g>)}
   </defs>
   <image href={`${base}neck.png`} x="490" y="235" width="200" height="115" clipPath={`url(#${id}-neck)`}/>
   <g ref={head} data-rig-head="">
    <image href={`${base}head.png`} x="480" y="20" width="280" height="390" clipPath={`url(#${id}-head)`}/>
    {art.eyes.map((eye,i)=><g key={eye.id} data-rig-eye={eye.id}>
     <image href={`${base}sclera.png`} x="570" y="170" width="130" height="60" clipPath={`url(#${id}-${eye.id}-patch)`}/>
     <g clipPath={`url(#${id}-${eye.id}-open)`}>
      <image href={`${base}sclera.png`} x="570" y="170" width="130" height="60"/>
      <g data-rig-pupil={eye.id} ref={el=>{pupils.current[i]=el;}}><image href={`${base}iris-${eye.id}.png`} x={eye.iris.x} y={eye.iris.y} width={eye.iris.width} height={eye.iris.height} clipPath={`url(#${id}-${eye.id}-iris)`}/></g>
     </g>
     <g clipPath={`url(#${id}-${eye.id}-patch)`}><image href={`${base}lids.png`} x="570" y="170" width="130" height="60" clipPath={`url(#${id}-${eye.id}-cover)`}/></g>
     <path ref={el=>{lids.current[i]=el;}} d={eyeContour(eye,1).top} fill="none" stroke="#352218" strokeWidth="1.4" strokeLinecap="round"/>
    </g>)}
   </g>
   <g data-rig-body=""><image href={`${base}master.png`} width="1254" height="1254" mask={`url(#${id}-body)`}/></g>
  </svg>}
 </span>;
}
