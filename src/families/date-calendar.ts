export const isoDate=(date:Date)=>`${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function parseDate(value:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [year,month,day]=value.split('-').map(Number);
 const date=new Date(0);date.setFullYear(year,month-1,day);date.setHours(12,0,0,0);
 return isoDate(date)===value?date:null;
}
export function moveMonth(date:Date,offset:number){
 const next=new Date(date);next.setDate(1);next.setMonth(next.getMonth()+offset);
 const last=new Date(next.getFullYear(),next.getMonth()+1,0).getDate();
 next.setDate(Math.min(date.getDate(),last));return next;
}
export function monthDays(date:Date){
 const start=new Date(date);start.setDate(1);start.setDate(1-start.getDay());
 return Array.from({length:42},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return day;});
}
