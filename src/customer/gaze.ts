export const gazeDirections=['right','down-right','down','down-left','left','up-left','up','up-right'] as const;
export type GazeDirection=typeof gazeDirections[number]|'neutral';
export function gazeDirection(x:number,y:number,current:GazeDirection='neutral'):GazeDirection{
 if(!Number.isFinite(x)||!Number.isFinite(y))return 'neutral';
 const radius=Math.hypot(x,y);
 if(radius<(current==='neutral'?48:32))return 'neutral';
 const angle=Math.atan2(y,x),sector=Math.PI/4;
 if(current!=='neutral'){
  const center=gazeDirections.indexOf(current)*sector;
  const difference=Math.abs(Math.atan2(Math.sin(angle-center),Math.cos(angle-center)));
  if(difference<sector/2+.12)return current;
 }
 return gazeDirections[(Math.round(angle/sector)+8)%8];
}
