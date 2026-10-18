import {useContext,useEffect,useId,useState,isValidElement,cloneElement,type ReactElement,type FormEvent,type ReactNode} from 'react';
import {DraftContext} from './lib/draft-guard';
import {safeMessage,statusLabels} from './lib/core';
export function Badge({status}:{status:string}){return <span className={`badge ${status}`}>{statusLabels[status]||status}</span>;}
export function Field({label,children,help}:{label:string;children:ReactNode;help?:ReactNode}){const id=useId();return <div className="field">{help?<div className="question-heading"><label htmlFor={id}>{label}</label>{help}</div>:<label htmlFor={id}>{label}</label>}{isValidElement(children)?cloneElement(children as ReactElement<{id:string}>,{id}):children}</div>;}
export function Panel({title,children}:{title:string;children:ReactNode}){return <section className="card"><h2>{title}</h2>{children}</section>;}
export function AsyncButton({action,children,className='',disabled=false}:{action:()=>Promise<unknown>;children:ReactNode;className?:string;disabled?:boolean}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <span className="action"><button className={className} disabled={busy||disabled} onClick={async()=>{setBusy(true);setError('');try{await action();}catch(e){setError(safeMessage(e));}finally{setBusy(false);}}}>{busy?'בתהליך…':children}</button>{error&&<span role="alert" className="error">{error}</span>}</span>;
}
export function SaveForm({save,children,label='שמירה',noValidate=false,successMessage='הפעולה נשמרה בהצלחה',protectDraft=true}:{save:(data:FormData)=>Promise<unknown>;children:ReactNode;label?:string;noValidate?:boolean;successMessage?:string;protectDraft?:boolean}){
 const registry=useContext(DraftContext);const id=useId();const [edited,setEdited]=useState(false);
 const mark=(dirty:boolean)=>{if(protectDraft){registry?.set(id,dirty);setEdited(dirty);}};
 useEffect(()=>()=>registry?.set(id,false),[registry,id]);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);mark(true);setBusy(true);setMessage('');setError('');try{await save(data);mark(false);setMessage(successMessage);}catch(e){setError(safeMessage(e));}finally{setBusy(false);}}
 return <form onSubmit={submit} noValidate={noValidate} onChange={()=>{mark(true);setMessage('');}}><fieldset disabled={busy}>{children}<button className="primary" type="submit">{busy?'שומר…':label}</button></fieldset>{registry&&edited&&<p className="muted" role="status">{busy?'השמירה בתהליך…':'יש שינויים שלא נשמרו'}</p>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status" className="success">{message}</p>}</form>;
}
export const textValue=(data:FormData,key:string)=>String(data.get(key)||'').trim();
export function Empty({children='אין פריטים להצגה'}:{children?:ReactNode}){return <p className="empty">{children}</p>;}
