/** Measured in the original 1254px canvas. These are masks, never face warps. */
export const rigArtwork = {
 canvas:1254,
 pivot:{x:587,y:301},
 headTravel:{x:2.4,y:1.3},
 headCut:'M480 20H760V240H704C696 270 675 300 631 319L634 351L604 390L581 361L550 333L525 300L514 277L516 250L500 258V235H480Z',
 // Remove the entire generated head, including a margin hidden by the original head.
 bodyCut:'M450 0H800V300H648C643 304 638 308 632 312L626 320L628 345L602 385L583 358L552 332L530 300L518 277H450Z',
 neckCut:'M519 250L638 281L628 347L603 385L583 358L552 332L530 300L518 277Z',
 eyes:[
  {id:'left',start:[580,185],end:[616,197],upper:[589,173,613,174],lower:[606,204,589,199],
   patch:'M577 183C584 168 613 169 620 190L620 204L580 203Z',
   iris:{x:588,y:177,width:24,height:24,cx:599.3,cy:188.3,rx:10.2,ry:10.6},travel:{x:5.5,y:3}},
  {id:'right',start:[655,205],end:[687,216],upper:[660,190,685,190],lower:[676,221,660,214],
   patch:'M652 202C658 186 686 187 692 209L690 224L650 218Z',
   iris:{x:655,y:193,width:28,height:28,cx:668.2,cy:206,rx:10.1,ry:10.6},travel:{x:4.7,y:2.7}},
 ]
} as const;

export type EyeArtwork = typeof rigArtwork.eyes[number];
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
/** Upper lid closes onto the lower arc. Textures and eyeballs keep their proportions. */
export function eyeContour(eye:EyeArtwork,open:number){
 const t=1-Math.max(0,Math.min(1,open));
 const [sx,sy]=eye.start,[ex,ey]=eye.end,[u1x,u1y,u2x,u2y]=eye.upper,[l1x,l1y,l2x,l2y]=eye.lower;
 const top=`M${sx} ${sy}C${mix(u1x,l2x,t)} ${mix(u1y,l2y,t)} ${mix(u2x,l1x,t)} ${mix(u2y,l1y,t)} ${ex} ${ey}`;
 const overlap=3*t*t*t;
 const cover=t===0?'M0 0Z':`M${sx-8} ${sy-25}H${ex+8}V${ey+overlap}H${ex}C${mix(u2x,l1x,t)} ${mix(u2y,l1y,t)+overlap} ${mix(u1x,l2x,t)} ${mix(u1y,l2y,t)+overlap} ${sx} ${sy+overlap}H${sx-8}Z`;
 return {top,cover,opening:`${top}C${l1x} ${l1y} ${l2x} ${l2y} ${sx} ${sy}Z`};
}
