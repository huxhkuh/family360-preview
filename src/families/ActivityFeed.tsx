import {useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {rpc} from '../lib/backend';
import {safeMessage} from '../lib/core';
import {Panel,Empty} from '../ui';
const cursorSchema=z.object({at:z.string(),key:z.string()});
const pageSchema=z.object({items:z.array(z.object({key:z.string(),at:z.string(),kind:z.enum(['event','contact','task']),title:z.string(),detail:z.string(),author:z.string(),target:z.enum(['overview','followups'])})),next:cursorSchema.nullable()});
type Page=z.infer<typeof pageSchema>;
export function ActivityFeed({familyId,version,open}:{familyId:string;version:unknown;open:(tab:'overview'|'followups')=>void}){
 const [kind,setKind]=useState('all');const [rows,setRows]=useState<Page['items']>([]);const [cursor,setCursor]=useState<Page['next']>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const generation=useRef(0);
 async function fetchPage(next:Page['next']=null){const request=++generation.current;setBusy(true);setError('');try{const data=pageSchema.parse(await rpc('rpc_family_activity',{p_family_id:familyId,p_kind:kind,p_cursor:next,p_limit:25}));if(request!==generation.current)return;setRows(old=>next?[...old,...data.items.filter(i=>!old.some(r=>r.key===i.key))]:data.items);setCursor(data.next);}catch(e){if(request===generation.current)setError(safeMessage(e));}finally{if(request===generation.current)setBusy(false);}}
 useEffect(()=>{setRows([]);setCursor(null);void fetchPage();return()=>{++generation.current;};},[familyId,kind,version]);
 return <Panel title="פעילות בתיק"><p className="muted">עדכוני התיק, קשר עם המשפחה ומצב הפעולות האחרון. התיעוד הפנימי גלוי לצוות בלבד.</p><nav className="tabs" aria-label="סינון פעילות בתיק">{[['all','הכול'],['contact','קשר עם המשפחה'],['task','פעולות'],['event','עדכוני תיק']].map(([k,l])=><button key={k} className={kind===k?'selected':'ghost'} aria-pressed={kind===k} onClick={()=>setKind(k)}>{l}</button>)}</nav>
 {rows.map(r=><article className="timeline-entry" key={r.key}><div><small>{new Date(r.at).toLocaleString('he-IL')}{r.author&&` · ${r.author}`}</small><h3>{r.title}</h3>{r.detail&&<p className="preserve-lines">{r.detail}</p>}{r.target==='followups'&&<button onClick={()=>open(r.target)}>לפעולות בתיק</button>}</div></article>)}{busy&&<p role="status">טוען פעילות…</p>}{error&&<div role="alert"><p className="error">{error}</p><button onClick={()=>fetchPage(rows.length?cursor:null)}>ניסיון נוסף בטעינת הפעילות</button></div>}{!busy&&!error&&!rows.length&&<Empty>אין פעילות שמתאימה לתצוגה זו.</Empty>}{cursor&&!error&&<button disabled={busy} onClick={()=>fetchPage(cursor)}>טעינת פעילות קודמת</button>}
 </Panel>;
}
