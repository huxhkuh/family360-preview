import {useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {backend,rpc} from '../lib/backend';
import {AsyncButton,Field,SaveForm,textValue} from '../ui';
import {Login} from './Auth';

export function AgentInvitation({token,session,done,cancel}:{token:string;session:Session|null;done:()=>Promise<void>;cancel:()=>void}){
 const [mode,setMode]=useState<'signup'|'login'>('signup');const [sent,setSent]=useState(false);
 if(session)return <main className="auth-card"><h1>הצטרפות כסוכן</h1><p>החשבון המחובר: {session.user.email}</p><p>באישור ההצטרפות תפקיד הסוכן יישמר בחשבון. הגישה תהיה לתיקים שהמנהל יקצה לך בלבד.</p>
 <AsyncButton action={async()=>{await rpc('rpc_accept_agent_invitation',{p_token:token});await done();}}>אישור הצטרפות כסוכן</AsyncButton>
 <AsyncButton action={async()=>{const {error}=await backend!.auth.signOut();if(error)throw error;}}>החלפת חשבון</AsyncButton><button className="ghost" onClick={cancel}>ביטול הצטרפות</button></main>;
 if(mode==='login')return <><div className="invite-banner"><p>התחברו לחשבון שלכם כדי לממש את הזמנת הסוכן.</p><button onClick={()=>setMode('signup')}>אין לי חשבון — הרשמה</button><button onClick={cancel}>ביטול הצטרפות</button></div><Login/></>;
 return <main className="auth-card"><div className="brand">360°</div><h1>הזמנה להצטרף כסוכן</h1><p>זהו קישור חד־פעמי. התפקיד יוקצה לאחר אימות הדוא״ל ואישור ההצטרפות; פתיחת הקישור לבדה אינה מעניקה הרשאות.</p>
 {sent?<section role="status"><h2>בדקו את תיבת הדוא״ל</h2><p>אם ההרשמה התקבלה, יישלח קישור לאימות. לאחר האימות חזרו לקישור ההזמנה המקורי והתחברו. אם כבר קיים חשבון, אפשר להתחבר או לשחזר סיסמה.</p></section>:<SaveForm label="הרשמה ושליחת אימות" save={async d=>{
 const password=textValue(d,'password');if(password!==textValue(d,'confirmation'))throw new Error('VALIDATION');
 const {error}=await backend!.auth.signUp({email:textValue(d,'email'),password,options:{data:{name:textValue(d,'name')},emailRedirectTo:location.origin}});
 if(error)throw error;setSent(true);
 }}><Field label="שם מלא"><input name="name" autoComplete="name" required minLength={2} maxLength={150}/></Field><Field label="דוא״ל"><input name="email" type="email" autoComplete="email" required maxLength={254}/></Field><Field label="סיסמה (12 תווים לפחות)"><input name="password" type="password" autoComplete="new-password" required minLength={12}/></Field><Field label="אימות סיסמה"><input name="confirmation" type="password" autoComplete="new-password" required minLength={12}/></Field></SaveForm>}
 <button className="ghost" onClick={()=>setMode('login')}>כבר יש לי חשבון — כניסה</button><button className="ghost" onClick={cancel}>ביטול הצטרפות</button></main>;
}
