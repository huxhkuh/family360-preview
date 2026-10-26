import {useId} from 'react';

// A shared 80-unit drawing grid: solid petals, circular cutouts and copper accents.
export function BenefitIcon({kind}:{kind:'people'|'connect'|'discover'|'advance'|'rights'|'shield'|'savings'|'bank'|'duplicate'|'percent'|'fees'|'document'}){
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
  {kind==='rights'&&<>
   <path d="M12 22Q12 9 25 9H38V29A14 14 0 0 0 25 43H12Z" fill={green}/>
   <path d="M44 9H56Q69 9 69 22V38H56A14 14 0 0 0 44 25Z" fill={copper}/>
   <path d="M12 49H25A14 14 0 0 0 38 60V73H25Q12 73 12 60Z" fill={copper}/>
   <path d="M36 45L45 54L65 34L74 43L45 72L27 54Z" fill={green}/>
  </>}
  {kind==='shield'&&<>
   <path d="M9 12H37V27A15 15 0 0 0 24 42H10L9 12Z" fill={green}/>
   <path d="M43 12H71L70 42H56A15 15 0 0 0 43 27Z" fill={copper}/>
   <path d="M11 48H25A15 15 0 0 0 37 57V74Q17 64 11 48Z" fill={copper}/>
   <path d="M43 57A15 15 0 0 0 55 48H69Q63 64 43 74Z" fill={green}/>
  </>}
  {kind==='savings'&&<>
   <path d="M9 50Q9 39 20 39H35V70H20Q9 70 9 59Z" fill={green}/>
   <path d="M41 31H58Q71 31 71 44V70H41Z" fill={green}/>
   <path d="M18 28V20Q18 8 30 8H37V18A11 11 0 0 0 27 28Z" fill={copper}/>
   <path d="M43 8H50Q62 8 62 20V28H53A11 11 0 0 0 43 18Z" fill={copper}/>
   <path d="M16 51H28M48 45H63M48 56H63" stroke="#f4efe5" strokeWidth="3" strokeLinecap="round"/>
  </>}
  {kind==='bank'&&<>
   <path d="M8 29L40 7L72 29V35H48A8 8 0 0 0 32 35H8Z" fill={copper}/>
   <path d="M13 41H25V59H13ZM34 41H46V59H34ZM55 41H67V59H55Z" fill={green}/>
   <path d="M8 72V68Q8 64 12 64H68Q72 64 72 68V72Z" fill={green}/>
  </>}
  {kind==='duplicate'&&<>
   <path d="M8 8H46V30Q46 47 27 58Q8 47 8 30Z" fill={copper}/>
   <path d="M29 25H72V46Q72 65 50 76Q29 65 29 46Z" fill={green}/>
   <path d="M35 31H45V41A12 12 0 0 0 35 51ZM51 31H66V42H62A12 12 0 0 0 51 41Z" fill="#f5f1e7"/>
  </>}
  {kind==='percent'&&<>
   <path fillRule="evenodd" d="M9 23A15 15 0 1 1 39 23A15 15 0 1 1 9 23ZM19 23A5 5 0 1 0 29 23A5 5 0 1 0 19 23Z" fill={green}/>
   <path fillRule="evenodd" d="M41 57A15 15 0 1 1 71 57A15 15 0 1 1 41 57ZM51 57A5 5 0 1 0 61 57A5 5 0 1 0 51 57Z" fill={green}/>
   <path d="M56 9H70L24 71H10Z" fill={copper}/>
  </>}
  {kind==='fees'&&<>
   <path d="M37 7A29 29 0 0 0 8 36V39H21V36A16 16 0 0 1 37 20Z" fill={green}/>
   <path d="M43 7A29 29 0 0 1 72 36V39H59V36A16 16 0 0 0 43 20Z" fill={copper}/>
   <path d="M8 45H22A17 17 0 0 0 37 56V70A30 30 0 0 1 8 45Z" fill={copper}/>
   <path d="M43 56A17 17 0 0 0 58 45H72A30 30 0 0 1 43 70Z" fill={green}/>
   <path d="M30 32H51V43H30Z" fill={green}/>
  </>}
  {kind==='document'&&<>
   <path d="M13 21Q13 8 26 8H46V26Q46 34 54 34H67V60Q67 73 54 73H13Z" fill={green}/>
   <path d="M52 8L68 27H52Z" fill={copper}/>
   <path d="M25 40H52M25 49H44" stroke="#f7f2e8" strokeWidth="4" strokeLinecap="round"/>
   <circle cx="56" cy="62" r="13" fill={copper}/><path d="M50 62L54 66L62 57" stroke="#fff8ed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </>}
 </svg>;
}
