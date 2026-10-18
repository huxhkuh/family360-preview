import {useEffect,useState} from 'react';
import {z} from 'zod';
import {rpc} from '../lib/backend';
import {safeMessage} from '../lib/core';
import {Badge,Empty,Field} from '../ui';
const cursorSchema=z.object({created_at:z.string(),id:z.string()});
const pageSchema=z.object({items:z.array(z.object({id:z.string(),name:z.string(),case_number:z.string(),status:z.string()})),next:cursorSchema.nullable()});
export function FamilyDirectory({query,cursor,onQuery,onPage,open,version}:{query:string;cursor?:string;onQuery:(q:string)=>void;onPage:(c?:string)=>void;open:(id:string)=>void;version:unknown}){
 const [result,setResult]=useState<z.infer<typeof pageSchema>|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(true);const [retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');setResult(null);const timer=setTimeout(async()=>{
  try{const c=cursor?cursorSchema.parse(JSON.parse(cursor)):null;const value=pageSchema.parse(await rpc('rpc_search_families',{p_query:query,p_cursor:c,p_limit:25}));if(active)setResult(value);}catch(e){if(active)setError(safeMessage(e));}finally{if(active)setBusy(false);}
 },250);return()=>{active=false;clearTimeout(timer);};},[query,cursor,retry,version]);
 return <section aria-label="ספריית המשפחות"><Field label="חיפוש משפחה"><input type="search" maxLength={150} value={query} onChange={e=>onQuery(e.target.value)} placeholder="שם, איש קשר, טלפון, דוא״ל או מספר תיק"/></Field><p className="muted">החיפוש כולל את כל התיקים שבגישה שלך.</p>
 {busy&&<p role="status">טוען משפחות…</p>}{error&&<div role="alert"><p className="error">{error}</p><button onClick={()=>setRetry(v=>v+1)}>ניסיון נוסף בחיפוש</button>{cursor&&<button onClick={()=>onPage()}>חזרה לתחילת הרשימה</button>}</div>}
 {result&&<><div className="table-wrap family-table"><table><thead><tr><th>משפחה</th><th>תיק</th><th>מצב</th><th className="family-open-column"/></tr></thead><tbody>{result.items.map(f=><tr key={f.id}><td><button className="text-button family-open" aria-label={`פתיחת התיק של ${f.name}`} onClick={()=>open(f.id)}>{f.name}</button></td><td>{f.case_number}</td><td><Badge status={f.status}/></td><td className="family-open-column"><button onClick={()=>open(f.id)}>פתיחה</button></td></tr>)}</tbody></table></div>{!result.items.length&&<Empty>לא נמצאו משפחות שמתאימות לחיפוש.</Empty>}<div className="chapter-actions">{(query||cursor)&&<button onClick={()=>{onQuery('');}}>ניקוי החיפוש וחזרה להתחלה</button>}{cursor&&<button onClick={()=>onPage()}>לעמוד הראשון</button>}{result.next&&<button onClick={()=>onPage(JSON.stringify(result.next))}>לעמוד הבא</button>}</div></>}
 </section>;
}
