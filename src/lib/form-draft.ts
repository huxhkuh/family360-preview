export type FormValues=Record<string,string[]>;
export type FormDraft={values:FormValues;baseline:FormValues};
export function draftAfterSave(current:FormDraft|undefined,submitted:FormValues):FormDraft|null{
 return current&&JSON.stringify(current.values)!==JSON.stringify(submitted)?{values:current.values,baseline:submitted}:null;
}
export function readForm(form:HTMLFormElement):FormValues{
 const values:FormValues={};for(const node of Array.from(form.elements)){
  if(!(node instanceof HTMLInputElement||node instanceof HTMLSelectElement||node instanceof HTMLTextAreaElement)||!node.name||node instanceof HTMLInputElement&&['file','submit','button'].includes(node.type))continue;
  values[node.name]??=[];
  if(node instanceof HTMLInputElement&&['checkbox','radio'].includes(node.type)){if(node.checked)values[node.name].push(node.value);}
  else if(node instanceof HTMLSelectElement&&node.multiple)values[node.name].push(...Array.from(node.selectedOptions,o=>o.value));
  else values[node.name].push(node.value);
 }return values;
}
export function restoreForm(form:HTMLFormElement,values:FormValues){
 for(const node of Array.from(form.elements)){
  if(!(node instanceof HTMLInputElement||node instanceof HTMLSelectElement||node instanceof HTMLTextAreaElement)||!Object.hasOwn(values,node.name))continue;
  const value=values[node.name];if(node instanceof HTMLInputElement&&['checkbox','radio'].includes(node.type))node.checked=value.includes(node.value);
  else if(node instanceof HTMLSelectElement&&node.multiple)Array.from(node.options).forEach(o=>o.selected=value.includes(o.value));
  else node.value=value[0]||'';
 }
}
