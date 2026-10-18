export const employmentValues=(value:unknown):string[]=>typeof value==='string'?[value]:Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):[];
export const employed=(answers:Record<string,unknown>,person:'h'|'w',kind:string)=>employmentValues(answers[person+'_emp']).includes(kind);
// Old records remain scalar until edited. Changing a selection never deletes detail fields.
export function toggleEmployment(value:unknown,kind:string,checked:boolean){
 const selected=employmentValues(value);
 if(!checked)return selected.filter(v=>v!==kind);
 if(['none','other'].includes(kind))return [kind];
 return [...selected.filter(v=>!['none','other',kind].includes(v)),kind];
}
