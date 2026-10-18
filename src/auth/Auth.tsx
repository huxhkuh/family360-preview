import {useState} from 'react';
import {backend} from '../lib/backend';
import {SaveForm,Field,textValue} from '../ui';
export function Login(){
 const [reset,setReset]=useState(false);
 return <main className="auth-layout"><section className="auth-hero"><div className="brand">360° <span>כלכלה נכונה</span></div><h1>תמונת מצב אחת.<br/>על כל הכסף של המשפחה.</h1><p>המידע, הבדיקות וההחלטות שלכם במקום אחד.</p></section><section className="auth-card"><h2>{reset?'שחזור סיסמה':'כניסה למערכת'}</h2><SaveForm label={reset?'שליחת קישור':'כניסה'} save={async d=>{
  const email=textValue(d,'email'),password=textValue(d,'password');
  const result=reset?await backend!.auth.resetPasswordForEmail(email,{redirectTo:location.origin}):await backend!.auth.signInWithPassword({email,password});
  if(result.error)throw result.error;
 }}><Field label="דוא״ל"><input name="email" type="email" autoComplete="username" required maxLength={254}/></Field>{!reset&&<Field label="סיסמה"><input name="password" type="password" autoComplete="current-password" required/></Field>}</SaveForm><button className="ghost" onClick={()=>setReset(!reset)}>{reset?'חזרה לכניסה':'שכחתי סיסמה'}</button></section></main>;
}
export function Recovery({done}:{done:()=>void}){return <main className="auth-card"><h1>הגדרת סיסמה חדשה</h1><SaveForm label="עדכון סיסמה" save={async d=>{const password=textValue(d,'password');if(password!==textValue(d,'confirmation'))throw new Error('VALIDATION');const {error}=await backend!.auth.updateUser({password});if(error)throw error;await backend!.auth.signOut();done();}}><Field label="סיסמה חדשה (12 תווים לפחות)"><input name="password" type="password" minLength={12} required autoComplete="new-password"/></Field><Field label="אימות סיסמה"><input name="confirmation" type="password" minLength={12} required autoComplete="new-password"/></Field></SaveForm></main>;}
export function Mfa({done}:{done:()=>Promise<void>}){
 const [factor,setFactor]=useState('');const [qr,setQr]=useState('');
 return <main className="auth-card"><h1>אימות דו־שלבי</h1><p>גישה ניהולית דורשת קוד מאפליקציית האימות.</p>{!factor?<SaveForm label="הכנת אימות" save={async()=>{
 const {data,error}=await backend!.auth.mfa.listFactors();if(error)throw error;
 const verified=data.totp.find(f=>f.status==='verified');
 if(verified){setFactor(verified.id);return;}
 for(const f of data.all.filter(f=>f.status==='unverified')){const result=await backend!.auth.mfa.unenroll({factorId:f.id});if(result.error)throw result.error;}
 const result=await backend!.auth.mfa.enroll({factorType:'totp',friendlyName:'Family360'});if(result.error)throw result.error;
 setQr(result.data.totp.qr_code);setFactor(result.data.id);
 }}><p>אם עדיין לא הוגדר אימות, יוצג קוד QR לסריקה.</p></SaveForm>:<>{qr&&<img className="qr" src={qr} alt="קוד QR להגדרת אפליקציית האימות"/>}<SaveForm label="אימות וכניסה" save={async d=>{const {error}=await backend!.auth.mfa.challengeAndVerify({factorId:factor,code:textValue(d,'code')});if(error)throw error;await done();}}><Field label="קוד בן שש ספרות"><input name="code" pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" required/></Field></SaveForm></>}<button className="ghost" onClick={()=>backend!.auth.signOut()}>יציאה</button></main>;
}
