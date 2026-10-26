import type {ReactNode} from 'react';

// Compact brand drawings: rounded logo pieces, open centres and a copper detail.
const drawings:Record<string,ReactNode>={
 overview:<><path d="M3 5Q3 3 5 3H14V10Q10 10 10 14H3ZM18 3H25Q29 3 29 7V14H22Q22 10 18 10ZM3 18H10Q10 22 14 22V29H7Q3 29 3 25ZM22 18H29V25Q29 29 25 29H18V22Q22 22 22 18Z"/><circle className="icon-accent" cx="16" cy="16" r="4"/></>,
 family:<><circle cx="11" cy="9" r="5"/><circle className="icon-accent" cx="23" cy="10" r="4"/><path d="M2 28V23Q2 16 9 16H13Q20 16 20 23V28ZM22 19Q30 18 30 25V28H23V23Q23 21 22 19Z"/></>,
 tasks:<><path d="M8 5H24Q28 5 28 9V26Q28 29 24 29H4V9Q4 5 8 5Z"/><rect className="icon-accent" x="11" y="2" width="10" height="7" rx="3"/><path className="icon-cutout" d="m10 19 4 4 8-10"/></>,
 meetings:<><path d="M7 5H25Q29 5 29 9V26Q29 29 25 29H3V9Q3 5 7 5Z"/><path className="icon-cutout" d="M4 13H28M10 4V8M22 4V8"/><rect className="icon-accent" x="10" y="18" width="5" height="5" rx="1.5"/><rect className="icon-accent" x="19" y="18" width="5" height="5" rx="1.5"/></>,
 followups:<><path d="M7 5H25Q29 5 29 9V26Q29 29 25 29H3V9Q3 5 7 5Z"/><path className="icon-cutout" d="M4 13H28M10 4V8M22 4V8m-11 12 3 3 6-6"/><circle className="icon-accent" cx="25" cy="25" r="5"/></>,
 notifications:<><path d="M7 12Q7 3 16 3Q25 3 25 12V18L29 24H3L7 18ZM12 27H20Q20 31 16 31Q12 31 12 27Z"/><circle className="icon-accent" cx="25" cy="7" r="5"/></>,
 admin:<><path d="M4 7H28V10H4ZM4 22H28V25H4Z"/><rect className="icon-accent" x="8" y="2" width="7" height="13" rx="3"/><rect className="icon-accent" x="19" y="17" width="7" height="13" rx="3"/></>,
 documents:<><path d="M8 3H19V10Q19 13 22 13H28V25Q28 29 24 29H4V7Q4 3 8 3Z"/><path className="icon-accent" d="M22 3 29 10H22Z"/><path className="icon-cutout" d="M10 19H22M10 24H18"/></>,
 work:<><path d="M3 10Q3 7 6 7H26Q29 7 29 10V26Q29 29 26 29H3Z"/><path className="icon-cutout" d="M4 17H28M11 7V3H21V7"/><rect className="icon-accent" x="12" y="14" width="8" height="7" rx="2"/></>,
 housing:<><path d="M3 14 16 3 29 14V29H3Z"/><path className="icon-accent" d="M13 29V19Q13 16 16 16Q19 16 19 19V29Z"/><rect className="icon-accent" x="22" y="5" width="4" height="7" rx="1"/></>,
 savings:<><path d="M3 23Q3 20 6 20H10V29H3ZM13 16Q13 13 16 13H20V29H13ZM23 9Q23 6 26 6H30V29H23Z"/><circle className="icon-accent" cx="10" cy="8" r="5"/></>,
 insurance:<><path d="M4 5 16 2 28 5V16Q28 25 16 31Q4 25 4 16Z"/><path className="icon-cutout" d="m10 16 4 4 8-9"/><path className="icon-accent" d="M16 2 28 5V11L16 8Z"/></>,
 banks:<><path className="icon-accent" d="M2 11 16 2 30 11V14H2Z"/><path d="M5 17H10V25H5ZM14 17H19V25H14ZM23 17H28V25H23ZM3 28H30V31H3Z"/></>,
 referrals:<><path d="M3 10Q3 3 10 3H19V9H10Q9 9 9 10V19H3ZM29 22Q29 29 22 29H13V23H22Q23 23 23 22V13H29Z"/><rect className="icon-accent" x="12" y="12" width="8" height="8" rx="3"/></>,
 telephone:<><path d="M5 3H12L15 10 11 14Q14 20 20 22L23 18 30 21V27Q30 31 26 30Q5 28 2 7Q2 3 5 3Z"/><path className="icon-accent" d="M19 3Q28 3 29 12H25Q24 7 19 7Z"/></>,
 check:<><circle cx="16" cy="16" r="14"/><path className="icon-cutout" d="m9 16 5 5 10-12"/></>,
 help:<><path d="M16 2Q30 2 30 16Q30 30 16 30H2V16Q2 2 16 2Z"/><path className="icon-cutout" d="M12 11Q12 7 16 7Q21 7 21 11Q21 14 17 16V19"/><circle className="icon-accent" cx="17" cy="24" r="2"/></>,
 clock:<><circle cx="16" cy="16" r="14"/><path className="icon-cutout" d="M16 8V16L22 20"/><circle className="icon-accent" cx="16" cy="16" r="2.5"/></>,
};
export function Icon({name}:{name:string}){return <svg className={`icon brand-icon icon-${name}`} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">{drawings[name]||drawings.documents}</svg>;}
