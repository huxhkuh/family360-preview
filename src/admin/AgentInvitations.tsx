import {useEffect,useState} from 'react';
import {z} from 'zod';
import {rpc} from '../lib/backend';
import {invitationLink} from '../auth/invitation';
import {safeMessage} from '../lib/core';
import {AsyncButton,Field,Panel,SaveForm,textValue} from '../ui';
const invitesSchema=z.array(z.object({id:z.string(),label:z.string(),email:z.string().nullable(),expires_at:z.string(),revoked_at:z.string().nullable(),accepted_at:z.string().nullable(),accepted_name:z.string().nullable()}));
type Invitation=z.infer<typeof invitesSchema>[number];
export function AgentInvitations(){
 const [items,setItems]=useState<Invitation[]>([]);const [link,setLink]=useState('');const [error,setError]=useState('');
 async function refresh(){setError('');try{setItems(invitesSchema.parse(await rpc('rpc_list_agent_invitations')));}catch(e){setError(safeMessage(e));}}
 useEffect(()=>{refresh();},[]);
 return <><Panel title="הזמנת סוכן באמצעות קישור"><p>כל קישור ניתן למימוש פעם אחת, במשך שבעה ימים. המוזמן חייב להירשם ולאמת דוא״ל. התפקיד נשמר בחשבון, עם עריכת תיקים שיוקצו אליו בלבד.</p>
 <SaveForm label="יצירת קישור הזמנה" save={async d=>{
 const result=z.object({token:z.string(),expires_at:z.string()}).parse(await rpc('rpc_create_agent_invitation',{p_label:textValue(d,'label'),p_email:textValue(d,'email')||null}));
 setLink(invitationLink(location.origin,result.token));await refresh();
 }}><Field label="שם המוזמן / תיאור ההזמנה"><input name="label" required minLength={2} maxLength={150}/></Field><Field label="הגבלה לדוא״ל מסוים (מומלץ, לא חובה)"><input name="email" type="email" maxLength={254}/></Field></SaveForm>
 {link&&<section><p>הקישור מוצג רק עכשיו. העתיקו ושלחו למוזמן באופן פרטי. ללא הגבלת דוא״ל, הראשון שמממש אותו מקבל את תפקיד הסוכן.</p><Field label="קישור ההזמנה"><textarea readOnly dir="ltr" value={link}/></Field><AsyncButton action={()=>navigator.clipboard.writeText(link)}>העתקת הקישור</AsyncButton></section>}</Panel>
 <Panel title="מעקב הזמנות">{error&&<p role="alert">{error}</p>}<AsyncButton action={refresh}>רענון הזמנות</AsyncButton>{items.map(i=><article className="priority-row" key={i.id}><div><strong>{i.label}</strong><p>{i.email||'ללא הגבלת דוא״ל'} · {i.accepted_at?`מומש על ידי ${i.accepted_name||'משתמש'} ב־${new Date(i.accepted_at).toLocaleString('he-IL')}`:i.revoked_at?'בוטל':Date.parse(i.expires_at)<Date.now()?'פג תוקף':`בתוקף עד ${new Date(i.expires_at).toLocaleString('he-IL')}`}</p></div>{!i.accepted_at&&!i.revoked_at&&Date.parse(i.expires_at)>Date.now()&&<AsyncButton action={async()=>{await rpc('rpc_revoke_agent_invitation',{p_invitation_id:i.id});setLink('');await refresh();}}>ביטול הזמנה</AsyncButton>}</article>)}</Panel></>;
}
