import {useEffect,useState} from 'react';
import type {Family} from '../lib/model';
import {rpc} from '../lib/backend';
import {Field,Panel,SaveForm} from '../ui';

const values=(family:Family)=>({contact_name:family.contact_name||'',phone:family.phone||'',email:family.email||'',internal_notes:family.internal_notes||''});
export function ContactDetails({family,staff,refresh,onDirtyChange}:{family:Family;staff:boolean;refresh:()=>Promise<void>;onDirtyChange:(dirty:boolean)=>void}){
 const [draft,setDraft]=useState(()=>values(family));const [saved,setSaved]=useState(()=>values(family));const [revision,setRevision]=useState(family.updated_at);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 const updatedElsewhere=family.updated_at!==revision;
 function reset(){const next=values(family);setDraft(next);setSaved(next);setRevision(family.updated_at);}
 // Accept fresh server data only when the form is clean. Keep the original
 // revision while editing so the server can reject a concurrent overwrite.
 useEffect(()=>{if(!dirty)reset();},[family.updated_at]);
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[dirty]);
 return <Panel title="פרטי קשר"><p className="muted">הפרטים מאפשרים לנציג לתאם איתכם את המשך הטיפול. שינויים נשמרים בלחיצה על שמירה.</p>
 {updatedElsewhere&&<p className="hint" role="status">התיק עודכן בזמן העריכה. הטיוטה שלכם נשמרה במסך. <button className="text-button" onClick={()=>{if(!dirty||window.confirm('לטעון את הנתונים המעודכנים ולוותר על השינויים שלא נשמרו?'))reset();}}>טעינת הפרטים המעודכנים</button></p>}
 <SaveForm protectDraft={false} save={async()=>{
  const {internal_notes,...contact}=draft;
  const result=await rpc<Family>('rpc_save_family',{p_family_id:family.id,p_patch:{...contact,...(staff?{internal_notes}:{})},p_expected_updated_at:revision});
  setSaved(draft);setRevision(result.updated_at);await refresh();
 }}><div className="fields"><Field label="איש קשר"><input value={draft.contact_name} onChange={e=>setDraft({...draft,contact_name:e.target.value})} required maxLength={150}/></Field><Field label="טלפון"><input value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})} type="tel" required maxLength={30}/></Field><Field label="דוא״ל"><input value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})} type="email"/></Field></div>
 {staff&&<Field label="הערות פנימיות — לצוות בלבד"><textarea value={draft.internal_notes} onChange={e=>setDraft({...draft,internal_notes:e.target.value})} maxLength={10000}/></Field>}
 <p className="muted" role="status">{dirty?'יש שינויים שלא נשמרו':'מוצגים הפרטים שנשמרו בתיק'}</p></SaveForm></Panel>;
}
