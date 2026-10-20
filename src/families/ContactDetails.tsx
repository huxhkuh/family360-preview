import {useEffect,useState} from 'react';
import type {Family} from '../lib/model';
import {rpc} from '../lib/backend';
import {Field,Panel,SaveForm} from '../ui';
import {useRetainedState} from '../lib/draft-guard';
const values=(family:Family)=>({contact_name:family.contact_name||'',phone:family.phone||'',email:family.email||'',internal_notes:family.internal_notes||''});
type Contact=ReturnType<typeof values>;
const labels:Record<keyof Contact,string>={contact_name:'איש קשר',phone:'טלפון',email:'דוא״ל',internal_notes:'הערות פנימיות — לצוות בלבד'};
export function ContactDetails({family,staff,refresh,onDirtyChange,compact=false}:{family:Family;staff:boolean;refresh:()=>Promise<void>;onDirtyChange?:(dirty:boolean)=>void;compact?:boolean}){
 const [work,setWork]=useRetainedState(`contact:${family.id}`,()=>({draft:values(family),saved:values(family),revision:family.updated_at}),v=>JSON.stringify(v.draft)!==JSON.stringify(v.saved),'פרטי קשר');
 const {draft,saved,revision}=work;const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 const [editing,setEditing]=useState<keyof Contact|'all'|null>(()=>dirty?'all':null);
 const [discard,setDiscard]=useState(false);
 const reset=()=>{const v=values(family);setWork({draft:v,saved:v,revision:family.updated_at});setDiscard(false);};
 useEffect(()=>{if(!dirty)reset();},[family.updated_at]);
 // This form retains its draft, so route changes do not require confirmation.
 useEffect(()=>{onDirtyChange?.(false);},[onDirtyChange]);
 const fields=(Object.keys(labels) as (keyof Contact)[]).filter(k=>staff||k!=='internal_notes');
 const content=<><p className="muted">{compact?'פרטים מהתיק, זמינים גם במהלך השיחה.':'אפשר לעדכן כל פרט במקום. רק שמירה מעדכנת את התיק.'}</p>
 <dl className="contact-inline">{fields.map(k=><div key={k}><dt>{labels[k]}</dt><dd><span dir={k==='phone'||k==='email'?'ltr':undefined}>{(dirty?draft:saved)[k]||'טרם הוזן'}</span><button type="button" className="text-button" onClick={()=>setEditing(k)}>עריכת {labels[k]}</button></dd></div>)}</dl>
 <button type="button" className="ghost" onClick={()=>setEditing(editing==='all'?null:'all')}>{editing==='all'?'קיפול פרטי הקשר':'עריכת כל פרטי הקשר'}</button>
 {dirty&&<p className="draft-notice" role="status">טיוטת פרטי קשר נשמרת במעבר בין מסכים. התיק יעודכן רק בלחיצה על שמירה.</p>}
 {editing&&<div className="inline-editor"><SaveForm key={editing} protectDraft={false} label={editing==='all'?'שמירת פרטי הקשר':`שמירת ${labels[editing]}`} successMessage="פרטי הקשר נשמרו בתיק. לא נשלחה הודעה." save={async()=>{
 const keys=editing==='all'?fields:[editing];const patch=Object.fromEntries(keys.map(k=>[k,draft[k]]));
 const result=await rpc<Family>('rpc_save_family',{p_family_id:family.id,p_patch:patch,p_expected_updated_at:revision});
 const nextSaved={...saved,...patch};setWork({...work,saved:nextSaved,revision:result.updated_at});await refresh();
 }}><div className="fields">{fields.filter(k=>editing==='all'||editing===k).map(k=><Field key={k} label={labels[k]}>{k==='internal_notes'?<textarea value={draft[k]} maxLength={10000} onChange={e=>setWork({...work,draft:{...draft,[k]:e.target.value}})}/>:<input value={draft[k]} required={k==='contact_name'||k==='phone'} type={k==='phone'?'tel':k==='email'?'email':'text'} maxLength={k==='phone'?30:k==='contact_name'?150:undefined} onChange={e=>setWork({...work,draft:{...draft,[k]:e.target.value}})}/>}</Field>)}</div>
 {family.updated_at!==revision&&<p className="hint">התיק עודכן מאז תחילת העריכה. הטיוטה עדיין במסך; אפשר לטעון את הפרטים המעודכנים לפני ניסיון נוסף.</p>}
 </SaveForm><div className="inline-actions"><button type="button" className="ghost" onClick={()=>setEditing(null)}>קיפול העריכה</button><button type="button" className="ghost" onClick={()=>dirty?setDiscard(true):reset()}>טעינת הפרטים המעודכנים</button></div>
 {discard&&<div className="hint"><p>להחליף את טיוטת הקשר בפרטים השמורים בתיק?</p><button type="button" onClick={reset}>כן, טעינת הפרטים</button><button type="button" className="ghost" onClick={()=>setDiscard(false)}>המשך עריכה</button></div>}</div>}</>;
 return compact?<section aria-label="פרטי קשר בזמן השיחה"><h3>פרטי קשר</h3>{content}</section>:<Panel title="פרטי קשר">{content}</Panel>;
}
