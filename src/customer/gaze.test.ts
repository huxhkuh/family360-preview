import {describe,it,expect} from 'vitest';
import {gazeDirection} from './gaze';
describe('mascot gaze in screen coordinates',()=>{
 it.each([[400,0,'right'],[400,400,'down-right'],[0,400,'down'],[-400,400,'down-left'],[-400,0,'left'],[-400,-400,'up-left'],[0,-400,'up'],[400,-400,'up-right']] as const)('looks toward %s,%s',(x,y,direction)=>expect(gazeDirection(x,y)).toBe(direction));
 it('keeps a resting region and a smaller return threshold',()=>{expect(gazeDirection(40,0)).toBe('neutral');expect(gazeDirection(40,0,'right')).toBe('right');expect(gazeDirection(20,0,'right')).toBe('neutral');});
 it('does not chatter at the boundary between two directions',()=>{const angle=Math.PI/8+.05;expect(gazeDirection(300*Math.cos(angle),300*Math.sin(angle),'right')).toBe('right');expect(gazeDirection(300*Math.cos(angle+.15),300*Math.sin(angle+.15),'right')).toBe('down-right');});
 it('uses a neutral fallback for invalid positions',()=>expect(gazeDirection(NaN,4)).toBe('neutral'));
});
