import {useEffect,useState} from 'react';
import {rpc,telephoneMessageUrl} from '../lib/backend';
import {AsyncButton,Field,Panel,SaveForm,textValue} from '../ui';
type Binding={id:string;phone:string;created_at:string};
type Message={id:string;created_at:string;status:'open'|'handled';handled_at:string|null};

export function TelephonePanel({familyId}:{familyId:string}){
 const [open,setOpen]=useState(false);const [bindings,setBindings]=useState<Binding[]>([]);const [messages,setMessages]=useState<Message[]>([]);const [error,setError]=useState('');const [audio,setAudio]=useState<{id:string;url:string}|null>(null);
 useEffect(()=>()=>{if(audio)URL.revokeObjectURL(audio.url);},[audio]);
 async function reload(){try{const [b,m]=await Promise.all([rpc<Binding[]>('rpc_list_telephone_bindings',{p_family_id:familyId}),rpc<Message[]>('rpc_list_telephone_messages',{p_family_id:familyId})]);setBindings(b);setMessages(m);setError('');}catch{setError('לא ניתן לטעון את פרטי הקו. נסו שוב או פנו למנהל המערכת.');}}
 useEffect(()=>{if(open)void reload();},[open,familyId]);
 return <details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>קו מידע טלפוני והודעות קוליות</summary><Panel title="קו מידע טלפוני"><p className="hint" role="status">הקו נמצא בהכנה ואינו זמין עדיין ללקוחות. אפשר להכין כאן שיוך מספרים.</p><p>רק מספר שאומת מול הלקוח ושויך לתיק יכול לקבל קוד כניסה. יש לוודא למי יש גישה למספר לפני השיוך.</p>{error&&<p role="alert" className="error">{error}</p>}
 <h3>מספרים מאומתים</h3>{bindings.length?bindings.map(b=><div key={b.id}><bdi dir="ltr">{b.phone}</bdi> <AsyncButton action={async()=>{await rpc('rpc_revoke_telephone_binding',{p_family_id:familyId,p_id:b.id});await reload();}}>ביטול שיוך המספר</AsyncButton></div>):!error&&<p>אין מספרים מאומתים בתיק.</p>}
 <SaveForm label="שיוך מספר מאומת" save={async d=>{await rpc('rpc_create_telephone_binding',{p_family_id:familyId,p_phone:textValue(d,'phone'),p_verified:d.get('verified')==='on'});await reload();}}><Field label="מספר טלפון לקבלת קוד קולי"><input name="phone" type="tel" dir="ltr" required minLength={9} maxLength={20}/></Field><label><input name="verified" type="checkbox" required/> אימתתי את זהות הלקוח ואת הגישה שלו למספר הזה</label></SaveForm>
 <h3>הודעות קוליות</h3>{messages.length?messages.map(m=><article key={m.id}><p>{new Date(m.created_at).toLocaleString('he-IL')} · {m.status==='open'?'ממתינה לטיפול':'טופלה'}</p><AsyncButton action={async()=>setAudio({id:m.id,url:await telephoneMessageUrl(m.id)})}>האזנה להודעה</AsyncButton>{audio?.id===m.id&&<audio controls src={audio.url}>הדפדפן אינו תומך בהשמעת ההקלטה.</audio>}{m.status==='open'&&<AsyncButton action={async()=>{await rpc('rpc_mark_telephone_message_handled',{p_family_id:familyId,p_id:m.id});await reload();}}>סימון ההודעה כטופלה</AsyncButton>}</article>):!error&&<p>אין הודעות קוליות בתיק.</p>}
 </Panel></details>;
}
