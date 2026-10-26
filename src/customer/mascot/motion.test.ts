import {describe,it,expect} from 'vitest';
import {MascotMotion,motionTuning,normalizedGaze} from './motion';
const run=(m:MascotMotion,seconds:number,hz=60)=>{for(let i=0;i<Math.round(seconds*hz);i++)m.advance(1/hz);return m.pose;};
const tracking=()=>{const m=new MascotMotion(()=>.5);m.setMode('pointer');return m;};
describe('mascot control signals — visual acceptance remains separate',()=>{
 it('accepts eye targets compensated for the rigid head transform',()=>{const m=tracking();m.setTarget({x:.6,y:.2},{x:.4,y:.1});const p=run(m,4);expect(p.head.x).toBeCloseTo(.6);expect(p.eyes.x).toBeCloseTo(.4);expect(p.eyes.y).toBeCloseTo(.1);});
 it('maps screen coordinates without RTL inversion and bounds diagonals',()=>{
  expect(normalizedGaze({x:400,y:100},{x:200,y:100},{x:200,y:200})).toEqual({x:1,y:0});
  const p=normalizedGaze({x:-900,y:900},{x:0,y:0},{x:100,y:100});expect(Math.hypot(p.x,p.y)).toBeCloseTo(1);expect(p.x).toBeLessThan(0);
  expect(normalizedGaze({x:NaN,y:0},{x:0,y:0},{x:1,y:1})).toEqual({x:0,y:0});
 });
 it('eyes lead the head and both settle',()=>{const m=tracking();m.setTarget({x:1,y:0});const early=run(m,.2);expect(early.eyes.x).toBeGreaterThan(early.head.x);const end=run(m,4);expect(end.eyes.x).toBe(1);expect(end.head.x).toBe(1);expect(run(m,1).head).toEqual(end.head);});
 it('is consistent at 30, 60 and 144 Hz',()=>{const poses=[30,60,144].map(hz=>{const m=tracking();m.setTarget({x:.7,y:-.3});return run(m,.5,hz);});for(const p of poses){expect(p.eyes.x).toBeCloseTo(poses[0].eyes.x,3);expect(p.head.x).toBeCloseTo(poses[0].head.x,3);}});
 it('limits speed and roll under fast reversals and circles',()=>{
  const m=tracking();let previous=m.pose;
  for(let i=0;i<1200;i++){
   m.setTarget(i<600?{x:i%2?1:-1,y:i%3?1:-1}:{x:Math.cos(i*.02),y:Math.sin(i*.02)});const p=m.advance(1/60);
   for(const key of ['x','y'] as const){expect(Math.abs(p.eyes[key]-previous.eyes[key])).toBeLessThanOrEqual(motionTuning.eyesSpeed/60+1e-9);expect(Math.abs(p.head[key]-previous.head[key])).toBeLessThanOrEqual(motionTuning.headSpeed/60+1e-9);expect(Math.abs(p.eyes[key])).toBeLessThanOrEqual(1);}
   expect(Math.abs(p.headRoll)).toBeLessThanOrEqual(motionTuning.headRoll);previous=p;
  }
 });
 it('returns gradually after pointer leave',()=>{const m=tracking();m.setTarget({x:1,y:.2});run(m,3);const before=m.pose;m.setMode('rest');expect(m.pose).toEqual(before);const next=m.advance(1/60);expect(next.eyes.x).toBeGreaterThan(.8);expect(next.eyes.x).toBeLessThan(before.eyes.x);expect(run(m,4).eyes).toEqual({x:0,y:0});expect(m.pose.head).toEqual({x:0,y:0});});
 it('reduced motion is neutral with no residual velocity or blink',()=>{const m=tracking();m.setTarget({x:1,y:0});run(m,1);m.setMode('reduced');const still=m.pose;expect(still).toEqual({eyes:{x:0,y:0},head:{x:0,y:0},headRoll:0,eyeOpen:1});expect(run(m,20)).toEqual(still);});
 it('idle stays subtle and has no body transform',()=>{const m=tracking();m.setMode('idle');for(let i=0;i<1200;i++){const p=m.advance(1/60);expect(Math.abs(p.eyes.x)).toBeLessThan(.07);expect(Math.abs(p.eyes.y)).toBeLessThan(.04);expect(p).not.toHaveProperty('body');}});
 it('blinks fully with variable intervals and slower reopening',()=>{let seed=0;const m=new MascotMotion(()=>((seed++%3)+1)/4),starts:number[]=[];let wasOpen=true,minimum=1;for(let i=0;i<3600;i++){const p=m.advance(1/120);minimum=Math.min(minimum,p.eyeOpen);expect(p.eyeOpen).toBeGreaterThanOrEqual(0);expect(p.eyeOpen).toBeLessThanOrEqual(1);if(wasOpen&&p.eyeOpen<1)starts.push(i/120);wasOpen=p.eyeOpen===1;}expect(minimum).toBe(0);expect(starts.length).toBeGreaterThan(3);expect(starts[2]-starts[1]).not.toBeCloseTo(starts[1]-starts[0],1);expect(motionTuning.blinkOpen).toBeGreaterThan(motionTuning.blinkClose);});
 it('ignores invalid deltas and bounds a resumed frame',()=>{const m=tracking();m.setTarget({x:1,y:0});expect(m.advance(NaN).eyes.x).toBe(0);expect(m.advance(-1).eyes.x).toBe(0);expect(m.advance(3600).eyes.x).toBeLessThanOrEqual(motionTuning.eyesSpeed*.05);});
});
