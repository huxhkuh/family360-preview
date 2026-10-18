export type Comparison = {
 kind:'expense'|'income'|'qualitative';period:'monthly'|'annual'|'one_off';status:'missing'|'estimate'|'quote'|'no_change';
 current:number|null;proposed:number|null;setup_cost:number|null;
 current_detail:string;proposed_detail:string;basis:string;conditions:string;
 current_source:string;proposed_source:string;checked_on:string;valid_until:string;
};
export const emptyComparison:Comparison={kind:'expense',period:'monthly',status:'missing',current:null,proposed:null,setup_cost:null,current_detail:'',proposed_detail:'',basis:'',conditions:'',current_source:'',proposed_source:'',checked_on:'',valid_until:''};
export const comparisonTextFields=['current_detail','proposed_detail','basis','conditions','current_source','proposed_source','checked_on','valid_until'] as const;
export function amount(value:unknown):number|null{
 if(value===null||value===undefined||typeof value==='boolean'||(typeof value!=='number'&&typeof value!=='string')||String(value).trim()==='')return null;
 const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=1e12?n:null;
}
export function readComparison(value:unknown):Comparison{
 const x=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const c={...emptyComparison};
 if(['expense','income','qualitative'].includes(String(x.kind)))c.kind=x.kind as Comparison['kind'];
 if(['monthly','annual','one_off'].includes(String(x.period)))c.period=x.period as Comparison['period'];
 if(['missing','estimate','quote','no_change'].includes(String(x.status)))c.status=x.status as Comparison['status'];
 for(const k of ['current','proposed','setup_cost'] as const)c[k]=amount(x[k]);
 for(const k of comparisonTextFields)c[k]=typeof x[k]==='string'?x[k].slice(0,5000):'';
 return c;
}
export function comparisonDelta(c:Comparison):number|null{
 if(c.kind==='qualitative'||c.status==='missing'||c.current===null||c.proposed===null)return null;
 return Math.round((c.kind==='income'?c.proposed-c.current:c.current-c.proposed)*100)/100;
}
// Legacy savings-only reports are never reverse-engineered into a current bill or offer.
export function comparisonFinancial(previous:Record<string,unknown>,c:Comparison):Record<string,unknown>{
 const {monthly,yearly,lump,increase,other,...rest}=previous;
 const delta=comparisonDelta(c);
 return {...rest,comparison:c,...(delta!==null&&delta>0?c.period==='monthly'?{monthly:delta,yearly:Math.round(delta*1200)/100}:c.period==='annual'?{yearly:delta}:{lump:delta}: {})};
}
export function comparisonGaps(c:Comparison){
 const gaps:string[]=[];
 if(c.status==='missing')gaps.push('סיום הבדיקה המקצועית');
 if(c.kind!=='qualitative'&&(c.current===null||c.proposed===null))gaps.push('סכום קיים וסכום מוצע באותה תקופה');
 if(!c.current_source.trim())gaps.push('מקור לנתון הקיים');
 if(!c.proposed_source.trim())gaps.push('מקור לחלופה המוצעת');
 if(!c.basis.trim())gaps.push('בסיס ההשוואה');
 if(!c.conditions.trim())gaps.push('תנאים ומגבלות');
 if(!c.checked_on)gaps.push('תאריך בדיקה');
 return gaps;
}
