import {useId} from 'react';

// A shared 80-unit drawing grid: solid petals, circular cutouts and copper accents.
export function BenefitIcon({kind}:{kind:'people'|'connect'|'discover'|'advance'}){
 const id=useId();
 const green=`url(#${id}-green)`;
 const copper=`url(#${id}-copper)`;
 return <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={`${id}-green`} x1="8" y1="8" x2="70" y2="74" gradientUnits="userSpaceOnUse"><stop stopColor="#17483b"/><stop offset="1" stopColor="#05251e"/></linearGradient>
   <linearGradient id={`${id}-copper`} x1="12" y1="8" x2="68" y2="72" gradientUnits="userSpaceOnUse"><stop stopColor="#f0b77d"/><stop offset=".38" stopColor="#dc965f"/><stop offset="1" stopColor="#9d502a"/></linearGradient>
  </defs>
  {kind==='people'&&<>
   <circle cx="26" cy="23" r="11" fill={green}/><circle cx="55" cy="23" r="11" fill={copper}/>
   <path d="M7 67V55Q7 40 22 40H37V49A13 13 0 0 0 26 62V70H10Q7 70 7 67Z" fill={green}/>
   <path d="M73 67V55Q73 40 58 40H43V49A13 13 0 0 1 54 62V70H70Q73 70 73 67Z" fill={copper}/>
  </>}
  {kind==='connect'&&<>
   <path d="M8 37V22Q8 10 20 10H36V23A17 17 0 0 0 23 37Z" fill={green}/>
   <path d="M42 5H59Q71 5 71 17V36H57A17 17 0 0 0 42 23Z" fill={copper}/>
   <path d="M74 42V59Q74 71 62 71H44V57A17 17 0 0 0 57 42Z" fill={green}/>
   <path d="M37 75H21Q9 75 9 63V44H23A17 17 0 0 0 37 57Z" fill={copper}/>
   <circle cx="40" cy="40" r="7" fill={green}/>
  </>}
  {kind==='discover'&&<>
   <path d="M8 34V21Q8 9 20 9H34V21A16 16 0 0 0 21 34Z" fill={green}/>
   <path d="M40 9H53Q65 9 65 21V34H53A16 16 0 0 0 40 21Z" fill={copper}/>
   <path d="M8 40H21A16 16 0 0 0 34 53V65H20Q8 65 8 53Z" fill={copper}/>
   <path d="M40 53A16 16 0 0 0 53 40H65V46Q65 54 59 59L73 73H58L48 63H40Z" fill={green}/>
  </>}
  {kind==='advance'&&<>
   <path d="M8 58Q8 46 20 46H28V72H8Z" fill={green}/>
   <path d="M33 44Q33 32 45 32H53V72H33Z" fill={green}/>
   <path d="M58 43H72V60Q72 72 60 72H58Z" fill={green}/>
   <path d="M40 8H59Q72 8 72 21V37H60V29L39 50L30 41L51 20H40Z" fill={copper}/>
  </>}
 </svg>;
}
