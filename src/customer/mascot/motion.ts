/** Continuous control signals for the layered mascot.
 * Gaze units [-1,1], time in seconds, roll in degrees. No body transforms. */
export type Gaze = {x:number;y:number};
export type RigPose = {eyes:Gaze;head:Gaze;headRoll:number;eyeOpen:number};
export type RigMode = 'pointer'|'idle'|'rest'|'reduced';
export const motionTuning = Object.freeze({eyesFrequency:26,headFrequency:9,eyesSpeed:5,headSpeed:1.25,headRoll:1.5,blinkMin:3.2,blinkMax:7.4,blinkClose:.075,blinkHold:.025,blinkOpen:.14});
type Axis = {position:number;velocity:number};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const axis=():Axis=>({position:0,velocity:0});
export function normalizedGaze(pointer:Gaze,face:Gaze,radius:Gaze):Gaze {
 if(![pointer.x,pointer.y,face.x,face.y,radius.x,radius.y].every(Number.isFinite)||radius.x<=0||radius.y<=0)return {x:0,y:0};
 const x=(pointer.x-face.x)/radius.x,y=(pointer.y-face.y)/radius.y,length=Math.max(1,Math.hypot(x,y));
 return {x:x/length,y:y/length};
}
// Analytic critically damped spring, with substeps and explicit velocity bounds.
function spring(a:Axis,target:number,dt:number,frequency:number,speed:number){
 const offset=a.position-target,term=a.velocity+frequency*offset,decay=Math.exp(-frequency*dt);
 const position=target+(offset+term*dt)*decay,delta=clamp(position-a.position,-speed*dt,speed*dt);
 a.velocity=Math.abs(position-a.position)>speed*dt?delta/dt:(a.velocity-frequency*term*dt)*decay;
 a.position=clamp(a.position+delta,-1,1);
 if(Math.abs(target-a.position)<1e-6&&Math.abs(a.velocity)<1e-5){a.position=target;a.velocity=0;}
}
const smooth=(v:number)=>v*v*(3-2*v);
export class MascotMotion {
 private ex=axis();private ey=axis();private hx=axis();private hy=axis();
 private target:Gaze={x:0,y:0};private eyeTarget:Gaze={x:0,y:0};private mode:RigMode='rest';
 private elapsed=0;private blinkAt=0;private blinking=-1;private eyeOpen=1;
 constructor(private random:()=>number=Math.random){this.scheduleBlink();}
 private scheduleBlink(){const sample=this.random();this.blinkAt=this.elapsed+motionTuning.blinkMin+clamp(Number.isFinite(sample)?sample:.5,0,1)*(motionTuning.blinkMax-motionTuning.blinkMin);}
 setMode(mode:RigMode){
  if(this.mode===mode)return;this.mode=mode;
  if(mode==='rest'||mode==='reduced')this.target={x:0,y:0};
  if(mode==='reduced')this.reset();
 }
 setTarget(target:Gaze,eyeTarget:Gaze=target){this.target=normalizedGaze(target,{x:0,y:0},{x:1,y:1});this.eyeTarget=normalizedGaze(eyeTarget,{x:0,y:0},{x:1,y:1});}
 reset(){this.ex=axis();this.ey=axis();this.hx=axis();this.hy=axis();this.target={x:0,y:0};this.eyeTarget={x:0,y:0};this.eyeOpen=1;this.blinking=-1;this.scheduleBlink();}
 get pose():RigPose{return {eyes:{x:this.ex.position,y:this.ey.position},head:{x:this.hx.position,y:this.hy.position},headRoll:this.hx.position*motionTuning.headRoll,eyeOpen:this.eyeOpen};}
 advance(seconds:number):RigPose {
  if(this.mode==='reduced'||!Number.isFinite(seconds)||seconds<=0)return this.pose;
  // Never replay hidden-tab elapsed time.
  let remaining=Math.min(seconds,.05);
  while(remaining>1e-8){
   const dt=Math.min(remaining,1/240);remaining-=dt;this.elapsed+=dt;
   const target=this.mode==='idle'?{x:.065*Math.sin(this.elapsed*.43),y:.035*Math.sin(this.elapsed*.31)}:this.mode==='pointer'?this.target:{x:0,y:0};
   const eyes=this.mode==='pointer'?this.eyeTarget:target;
   spring(this.ex,eyes.x,dt,motionTuning.eyesFrequency,motionTuning.eyesSpeed);spring(this.ey,eyes.y,dt,motionTuning.eyesFrequency,motionTuning.eyesSpeed);
   spring(this.hx,target.x,dt,motionTuning.headFrequency,motionTuning.headSpeed);spring(this.hy,target.y,dt,motionTuning.headFrequency,motionTuning.headSpeed);
   if(this.blinking<0&&this.elapsed>=this.blinkAt)this.blinking=0;
   if(this.blinking>=0){
    this.blinking+=dt;const {blinkClose:c,blinkHold:h,blinkOpen:o}=motionTuning;
    this.eyeOpen=this.blinking<c?1-smooth(this.blinking/c):this.blinking<c+h?0:smooth(clamp((this.blinking-c-h)/o,0,1));
    if(this.blinking>=c+h+o){this.blinking=-1;this.eyeOpen=1;this.scheduleBlink();}
   }
  }
  return this.pose;
 }
}
