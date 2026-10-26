import React from 'react';
import {createRoot} from 'react-dom/client';
import {Demo} from './Demo';
import '@fontsource-variable/assistant';
import './styles.css';
import './design.css';
import './mint.css';
import './mint-client.css';
import './branding/mesudarim.css';
import './client-focus.css';
import './meetings/meeting-launch.css';
import './meetings/call-reference.css';
import './meetings/checklist-guidance.css';
import './meetings/call-session.css';
import './representative/representative.css';
class Boundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<main className="auth-card"><h1>אירעה תקלה בתצוגה</h1><p>יש לטעון מחדש את המסך.</p><button onClick={()=>location.reload()}>טעינה מחדש</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary><Demo/></Boundary></React.StrictMode>);

import './landing/welcome.css';
import './branding/workspaces.css';
import './branding/controls.css';

import './landing/premium.css';
