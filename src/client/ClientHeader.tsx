import {useRef} from 'react';
import type {Workspace} from '../lib/model';
import type {RouteState} from '../lib/navigation';
import {clientNavActive,clientQuestionnaireRoute} from '../lib/client-navigation';
import {BrandLogo} from '../branding/Brand';
import {Icon} from '../icons';
import {AsyncButton} from '../ui';

export function ClientHeader({w,route,open,refresh,focus,menu,toggleMenu,signOut}:{w:Workspace;route:RouteState;open:(r:RouteState)=>void;refresh:()=>Promise<void>;focus:boolean;menu:boolean;toggleMenu:()=>void;signOut:()=>Promise<void>}){
 const account=useRef<HTMLDetailsElement>(null);
 const family=w.families.find(f=>f.id===(route.page==='families'?route.id:route.family))||w.families[0];
 const owner=w.representatives.find(r=>r.id===family?.representative_id)?.name;
 const go=(r:RouteState)=>{if(account.current)account.current.open=false;open(r);};
 const primary:[RouteState,string,string][]=[[{page:'overview'},'עכשיו','home'],[w.families.length===1?{page:'families',id:family.id,tab:'documents'}:{page:'families'},'התיק שלנו','account'],[{page:'help',family:family?.id},owner?`הקשר עם ${owner.split(' ')[0]}`:'הקשר עם הנציג','help']];
 return <aside className="sidebar client-brandbar"><button className="client-brand" onClick={()=>go({page:'overview'})} aria-label="מסודרים 360 — למסך הבית"><BrandLogo mark mode="dark"/><span><strong>מסודרים 360°</strong><small>עושים לך סדר בכסף.</small></span></button>
  {focus&&<button type="button" className="mobile-task-menu" aria-expanded={menu} aria-controls="client-task-navigation" onClick={toggleMenu}>{menu?'סגירת התפריט':'תפריט ותיק'}<Icon name="account"/></button>}
  <nav id="client-task-navigation" aria-label="ניווט ראשי"><div className="client-primary-nav">{primary.map(([target,label,icon])=><button key={target.page} className={clientNavActive(route)===target.page?'active':''} aria-current={clientNavActive(route)===target.page?'page':undefined} onClick={()=>go(target)}><Icon name={icon}/>{label}</button>)}</div></nav>
   <details className="client-account" ref={account} onKeyDown={e=>{if(e.key==='Escape'&&account.current){account.current.open=false;account.current.querySelector('summary')?.focus();}}}><summary><span className="client-account-icon"><Icon name="questionnaire"/></span><span><strong>{family?.name||w.profile.name}</strong><small>{family?`תיק ${family.case_number}`:'החשבון שלי'}{owner?` / ${owner}`:''}</small></span><span aria-hidden="true">⌄</span><span className="sr-only">החשבון שלי</span></summary><div className="client-account-menu"><strong>{w.profile.name}</strong><button aria-current={clientNavActive(route)==='questionnaire'?'page':undefined} onClick={()=>go(clientQuestionnaireRoute(w))}><Icon name="questionnaire"/>שאלון</button><button onClick={()=>go({page:'meetings'})}><Icon name="meetings"/>פגישות</button><button onClick={()=>go({page:'followups'})}><Icon name="followups"/>מעקב</button><button onClick={()=>go({page:'notifications'})}><Icon name="notifications"/>התראות{w.notifications.some(n=>!n.read_at)&&<span className="client-unread" aria-label="יש עדכונים חדשים"/>}</button>{w.families.length>1&&<button onClick={()=>go({page:'families'})}>כל התיקים שלי</button>}<AsyncButton action={refresh}>רענון נתונים</AsyncButton><AsyncButton action={signOut}>יציאה</AsyncButton></div></details>
 </aside>;
}
