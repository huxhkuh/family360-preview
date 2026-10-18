import {useContext,useEffect,useId,useState,createContext,isValidElement,cloneElement,type ReactElement,type FormEvent,type ReactNode} from 'react';
import {DraftContext} from './lib/draft-guard';
import {safeMessage,statusLabels} from './lib/core';
const ValidationContext=createContext<Record<string,string>>({});
export function Badge({status}:{status:string}){return <span className={`badge ${status}`}>{statusLabels[status]||status}</span>;}
export function Field({label,children,help}:{label:string;children:ReactNode;help?:ReactNode}){
 const id=useId();const errors=useContext(ValidationContext);const error=errors[id];
 const child=children as ReactElement<{id:string;'aria-invalid'?:boolean;'aria-describedby'?:string}>;
 return <div className="field">{help?<div className="question-heading"><label htmlFor={id}>{label}</label>{help}</div>:<label htmlFor={id}>{label}</label>}{isValidElement(children)?cloneElement(child,{id,...(error?{'aria-invalid':true,'aria-describedby':[child.props['aria-describedby'],id+'-error'].filter(Boolean).join(' ')}:{})}):children}{error&&<p className="field-error" id={id+'-error'}>{error}</p>}</div>;
}
export function Panel({title,children}:{title:string;children:ReactNode}){return <section className="card"><h2>{title}</h2>{children}</section>;}
export function AsyncButton({action,children,className='',disabled=false}:{action:()=>Promise<unknown>;children:ReactNode;className?:string;disabled?:boolean}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <span className="action"><button className={className} disabled={busy||disabled} onClick={async()=>{setBusy(true);setError('');try{await action();}catch(e){setError(safeMessage(e));}finally{setBusy(false);}}}>{busy?'בתהליך…':children}</button>{error&&<span role="alert" className="error">{error}</span>}</span>;
}
export function SaveForm({save,children,label='שמירה',noValidate=false,successMessage='הפעולה נשמרה בהצלחה',protectDraft=true,submitActions}:{save:(data:FormData,action?:string)=>Promise<unknown>;children:ReactNode;label?:string;noValidate?:boolean;successMessage?:string;protectDraft?:boolean;submitActions?:ReactNode}){
 const registry=useContext(DraftContext);const id=useId();const [edited,setEdited]=useState(false);
 const mark=(dirty:boolean)=>{if(protectDraft){registry?.set(id,dirty);setEdited(dirty);}};
 useEffect(()=>()=>registry?.set(id,false),[registry,id]);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');const [fields,setFields]=useState<Record<string,string>>({});
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget;const submitter=(e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;setMessage('');setError('');
  if(!noValidate){
   form.querySelectorAll<HTMLTextAreaElement>('[data-json-array]').forEach(el=>{try{if(!Array.isArray(JSON.parse(el.value)))throw Error();el.setCustomValidity('');}catch{el.setCustomValidity('יש להזין מערך JSON תקין, למשל [].');}});
   const invalid=[...form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')].filter(el=>el.willValidate&&!el.validity.valid&&!(submitter?.formNoValidate&&el.validity.valueMissing));
   if(invalid.length){const errors:Record<string,string>={};invalid.forEach(el=>{if(el.id)errors[el.id]=el.validity.customError?el.validationMessage:el.validity.valueMissing?'יש להשלים את השדה.':el.validity.typeMismatch?'יש להזין כתובת דוא״ל או קישור תקינים.':el.validity.rangeUnderflow||el.validity.rangeOverflow?'הערך מחוץ לטווח המותר.':el.validity.tooShort?'יש להזין ערך ארוך יותר.':'יש לבדוק את הערך שהוזן.';});setFields(errors);setError('יש לתקן את השדות המסומנים. התוכן שהוזן נשמר במסך.');invalid.forEach(el=>{let parent=el.parentElement;while(parent){if(parent instanceof HTMLDetailsElement)parent.open=true;parent=parent.parentElement;}});invalid[0].focus();return;}
  }
  setFields({});const data=new FormData(form);mark(true);setBusy(true);try{await save(data,submitter?.value);mark(false);setMessage(successMessage);}catch(e){setError(safeMessage(e));}finally{setBusy(false);}
 }
 return <ValidationContext.Provider value={fields}><form onSubmit={submit} noValidate onChange={e=>{mark(true);setMessage('');const target=e.target as HTMLElement;if(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement)target.setCustomValidity('');if(target.id)setFields(old=>{const next={...old};delete next[target.id];return next;});}}><fieldset disabled={busy}>{children}{submitActions||<button className="primary" type="submit">{busy?'שומר…':label}</button>}</fieldset>{registry&&edited&&<p className="muted" role="status">{busy?'השמירה בתהליך…':'יש שינויים שלא נשמרו'}</p>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status" className="success">{message}</p>}</form></ValidationContext.Provider>;
}
export const textValue=(data:FormData,key:string)=>String(data.get(key)||'').trim();
export function Empty({children='אין פריטים להצגה'}:{children?:ReactNode}){return <p className="empty">{children}</p>;}
