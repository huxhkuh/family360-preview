import {backend} from '../lib/backend';
import {AsyncButton} from '../ui';
import {signInWithGoogle} from './google';
import './google.css';
export function GoogleSignIn(){
 if(import.meta.env.VITE_GOOGLE_AUTH_ENABLED!=='true')return null;
 return <div className="google-signin"><AsyncButton className="google-signin-button" action={async()=>{if(!backend)throw Error('CONFIG_INVALID');await signInWithGoogle(backend.auth,window.location.origin);}}><span className="google-signin-icon" aria-hidden="true">G</span>המשך עם Google</AsyncButton><div className="google-signin-divider"><span>או באמצעות דוא״ל</span></div></div>;
}
