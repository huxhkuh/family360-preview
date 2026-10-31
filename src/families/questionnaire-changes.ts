import type {Answers} from './questionnaire-definition';

function canonical(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value)??'undefined';
}
export function changedAnswerKeys(before:Answers={},after:Answers={}){
 return new Set([...Object.keys(before),...Object.keys(after)].filter(key=>canonical(before[key])!==canonical(after[key])));
}
export function snapshotAffected(snapshot:unknown,keys:Set<string>){
 return Array.isArray(snapshot)&&snapshot.some(field=>field&&typeof field.key==='string'&&keys.has(field.key));
}
