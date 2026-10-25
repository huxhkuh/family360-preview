export const SERVICE_PRICE_AGOROT=49000;
export const money=(agorot:number)=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:2}).format(agorot/100);
export function parseMoney(value:string){
 if(!/^\d+(?:\.\d{1,2})?$/.test(value.trim()))throw Error('VALIDATION');
 const amount=Math.round(Number(value)*100);if(!Number.isSafeInteger(amount)||amount<=0||amount>100000000)throw Error('VALIDATION');return amount;
}
