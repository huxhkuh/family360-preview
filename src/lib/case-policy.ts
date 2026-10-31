export const representativeCallConfirmed='הנציג אישר שהתקיימה שיחת היכרות עם המשפחה';
export function supportClosed(status:string,reports:{status?:string;snapshot?:{approved_at?:string}|null}[],time=Date.now()){
 if(status!=='completed')return false;
 const dates=reports.filter(r=>r.status==='approved').map(r=>Date.parse(r.snapshot?.approved_at||'')).filter(Number.isFinite);
 return dates.length>0&&time>=Math.max(...dates)+7*24*60*60*1000;
}
