import {useEffect,useState} from 'react';
import {App} from './App';
import {WelcomePage,LearnPage} from './landing/WelcomePage';
import {backend} from './lib/live-backend';
import {SaveForm,Field,textValue} from './ui';
import {BrandLogo} from './branding/Brand';
export function Live(){
 const [screen,setScreen]=useState(location.hash==='#signup'?'signup':location.hash.startsWith('#/')||location.hash.includes('access_token=')||location.search.includes('code=')||sessionStorage.getItem('f360.pending-agent-invitation')?'workspace':'home');
 useEffect(()=>{window.scrollTo(0,0);},[screen]);
 useEffect(()=>{const change=()=>{if(location.hash.startsWith('#/')||location.hash.includes('agent-invite')||location.search.includes('code='))setScreen('workspace');};addEventListener('hashchange',change);return()=>removeEventListener('hashchange',change);},[]);
 const open=(next:string)=>{setScreen(next);if(next==='workspace'&&!location.hash.startsWith('#/'))location.hash='/overview';else if(next==='signup')location.hash='signup';else if(next==='home')location.hash='welcome';};
 if(screen==='workspace')return <><div className="live-toolbar"><button onClick={()=>open('home')}><BrandLogo/></button><span>סביבת בדיקה · יש להשתמש בנתונים סינתטיים בלבד</span></div><App/></>;
 if(screen==='signup')return <Registration onLogin={()=>open('workspace')}/>;
 const props={onSystem:()=>open('workspace'),onStart:()=>open('signup'),onLearn:()=>open('learn'),onHome:()=>open('home')};return <><aside className="live-notice" role="note">סביבת בדיקה · ההרשמה אמיתית, ללא סליקה או חיוב · יש להשתמש בנתוני תיק סינתטיים בלבד <button onClick={()=>open('workspace')}>כניסה לחשבון</button></aside>{screen==='learn'?<LearnPage {...props}/>:<WelcomePage {...props}/>}</>;
}
function Registration({onLogin}:{onLogin:()=>void}){
 const [sent,setSent]=useState(false);
 return <main className="auth-card"><BrandLogo/><h1>פתיחת חשבון</h1><p>סביבת בדיקה. אין להזין מידע אישי אמיתי. לא מתבצע חיוב כספי בהרשמה.</p>{sent?<p role="status">אם ההרשמה התקבלה, נשלח קישור לאימות הדוא״ל. לאחר האימות אפשר להיכנס.</p>:<SaveForm label="הרשמה ושליחת קישור אימות" save={async d=>{if(!backend)throw Error('CONFIG_INVALID');const password=textValue(d,'password');if(password!==textValue(d,'confirmation'))throw Error('VALIDATION');const {error}=await backend.auth.signUp({email:textValue(d,'email'),password,options:{emailRedirectTo:location.origin+'/#/overview',data:{name:textValue(d,'name')}}});if(error)throw error;setSent(true);}}><Field label="שם מלא"><input name="name" required minLength={2} maxLength={150} autoComplete="name"/></Field><Field label="דוא״ל"><input name="email" type="email" required autoComplete="email"/></Field><Field label="סיסמה (12 תווים לפחות)"><input name="password" type="password" required minLength={12} autoComplete="new-password"/></Field><Field label="אימות סיסמה"><input name="confirmation" type="password" required minLength={12} autoComplete="new-password"/></Field></SaveForm>}<button onClick={onLogin}>כניסה לחשבון קיים</button></main>;
}
