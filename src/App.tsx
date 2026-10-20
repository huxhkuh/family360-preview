import {BrandLogo} from './branding/Brand';
import {clientNavActive,clientQuestionnaireRoute} from './lib/client-navigation';
import {notificationTarget} from './lib/client-notifications';
import {DraftShelf} from './DraftShelf';
import {FamilyDirectory} from './families/FamilyDirectory';
import {useNavigation} from './lib/use-navigation';
import type {PageName,RouteState} from './lib/navigation';
import {useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {backend,configError,loadWorkspace,rpc,WorkspaceNetworkError} from './lib/backend';
import {safeMessage} from './lib/core';
import type {Workspace} from './lib/model';
import {Login,Mfa,Recovery} from './auth/Auth';
import {AgentInvitation} from './auth/AgentInvitation';
import {captureInvitation,clearInvitation} from './auth/invitation';
import {FamilyView,can} from './families/FamilyView';
import {Tasks} from './tasks/Tasks';
import {Meetings} from './meetings/Meetings';
import {Overview} from './Overview';
import {FollowUps} from './followups/FollowUps';
import {Icon} from './icons';
import {DraftContext,useDraftRegistry} from './lib/draft-guard';
import {familyMatches} from './lib/family-search';
import type {Destination} from './lib/workflow';
import {Admin} from './admin/Admin';
import {AsyncButton,Badge,Empty,Field,Panel,SaveForm,textValue} from './ui';

const invitationStorage={getItem:(key:string)=>sessionStorage.getItem(key),setItem:(key:string,value:string)=>sessionStorage.setItem(key,value),removeItem:(key:string)=>sessionStorage.removeItem(key)};
function captureInvite(){
 const token=captureInvitation(location.hash,invitationStorage);
 if(new URLSearchParams(location.hash.slice(1)).has('agent-invite'))history.replaceState(null,'',location.pathname+location.search);
 return token;
}
const initialInvitation=captureInvite();

export function App(){
 const [invitation,setInvitation]=useState(initialInvitation);
 const cancelInvitation=()=>{clearInvitation(invitationStorage);setInvitation('');};
 useEffect(()=>{const changed=()=>setInvitation(captureInvite());addEventListener('hashchange',changed);return()=>removeEventListener('hashchange',changed);},[]);
 const [taskMenu,setTaskMenu]=useState(false);
 const [session,setSession]=useState<Session|null>(null);const [w,setW]=useState<Workspace|null>(null);
 const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [mfa,setMfa]=useState(false);const [recovery,setRecovery]=useState(false);
 const drafts=useDraftRegistry();const [questionnaireDirty,setQuestionnaireDirty]=useState(false);const leave=()=>!(questionnaireDirty||drafts.hasChanges())||window.confirm('יש שינויים שלא נשמרו. לצאת בלי לשמור?');
 const navigation=useNavigation(leave);const locationState=navigation.route;const route=locationState.page;const familyId=route==='families'?locationState.id||'':locationState.family||'';const familyTab=(locationState.tab||'overview') as Destination;const search=locationState.q||'';const setSearch=(q:string)=>navigation.query({q,cursor:undefined});const generation=useRef(0);
 useEffect(()=>{drafts.working.clear();},[session?.user.id,w?.profile.id,w?.profile.role]);
 const scopeRef=useRef(familyId);scopeRef.current=familyId;
 useEffect(()=>{if(w?.familyDirectoryEnabled&&w.profile.role!=='professional'&&familyId&&w.scopedFamilyId!==familyId)void refresh().catch(()=>{});},[familyId,w?.familyDirectoryEnabled]);
 async function refresh(){const request=++generation.current;setError('');try{const data=await loadWorkspace(scopeRef.current||undefined);if(request===generation.current){setW(data);setMfa(false);}}catch(e){if(request===generation.current){if(e instanceof WorkspaceNetworkError){setError('החיבור נותק. מוצגים הנתונים האחרונים; שינויים שלא נשמרו נשארו במסך. נסו לרענן שוב.');}else{setW(null);const msg=e&&typeof e==='object'&&'message' in e?String(e.message):'';if(msg.includes('MFA_REQUIRED'))setMfa(true);else setError(safeMessage(e));}}throw e;}finally{if(request===generation.current)setLoading(false);}}
 useEffect(()=>{
  if(!backend){setLoading(false);return;}
  let active=true;
  const {data}=backend.auth.onAuthStateChange((event,s)=>{if(!active)return;setSession(s);if(event==='PASSWORD_RECOVERY')setRecovery(true);if(!s){++generation.current;setW(null);setMfa(false);setLoading(false);}});
  backend.auth.getSession().then(({data,error})=>{if(active){setSession(data.session);if(error)setError(safeMessage(error));setLoading(false);}});
  return()=>{active=false;data.subscription.unsubscribe();};
 },[]);
 useEffect(()=>{if(session){setLoading(true);refresh().catch(()=>{});}},[session?.access_token]);
 useEffect(()=>{
  if(!w||!backend)return;
  const id=w.profile.id;
  const channel=backend.channel(`notifications:${id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`profile_id=eq.${id}`},()=>refresh().catch(()=>{})).subscribe();
  const visibility=()=>{if(document.visibilityState==='visible')refresh().catch(()=>{});};
  document.addEventListener('visibilitychange',visibility);
  return()=>{backend!.removeChannel(channel);document.removeEventListener('visibilitychange',visibility);};
 },[w?.profile.id]);
 if(!backend)return <main className="auth-card"><div className="brand">360°</div><h1>המערכת מוכנה להגדרת חיבור</h1><p>{configError?safeMessage(configError):'מנהל המערכת צריך להשלים את הגדרת בסיס הנתונים לפני הכניסה.'}</p><p>פרטי ההקמה נמצאים במדריך המצורף לפרויקט.</p></main>;
 if(recovery)return <Recovery done={()=>setRecovery(false)}/>;
 if(mfa)return <Mfa done={refresh}/>;
 if(invitation)return <AgentInvitation token={invitation} session={session} cancel={cancelInvitation} done={async()=>{await refresh();cancelInvitation();}}/>;
 if(loading&&!w)return <main className="auth-card" role="status">טוען את סביבת העבודה…</main>;
 if(!session)return <Login/>;
 if(!w)return <main className="auth-card"><h1>לא ניתן לטעון את החשבון</h1><p role="alert">{error}</p><AsyncButton action={refresh}>ניסיון נוסף</AsyncButton><AsyncButton action={async()=>{if(!leave())return;const {error}=await backend!.auth.signOut();if(error)throw error;}}>יציאה</AsyncButton></main>;
 const family=w.families.find(f=>f.id===familyId);const filteredFamilies=w.families.filter(f=>familyMatches(f,search));const staff=['admin','representative'].includes(w.profile.role);
 const nav=[['overview','סקירה'],...(w.profile.role==='client'?[['questionnaire','שאלון']]:[]),...(w.profile.role!=='professional'?[['families','משפחות']]:[]),...(staff||w.profile.role==='professional'?[['tasks','משימות']]:[]),...(w.profile.role!=='professional'?[['meetings','פגישות'],['followups','מעקב']]:[]),['notifications','התראות'],...(w.profile.role==='admin'?[['admin','ניהול']]:[])];
 const openRecord=(r:RouteState)=>{if(w.familyDirectoryEnabled&&r.id&&['tasks','meetings'].includes(r.page)){const record=r.page==='meetings'?w.meetings.find(m=>m.id===r.id):[...w.analysisTasks,...w.executionTasks].find(t=>t.id===r.id);if(record)r={...r,family:record.family_id};}if(navigation.go(r)){setQuestionnaireDirty(false);setTaskMenu(false);}};
 const openFamily=(id:string,target:Destination='overview')=>{
  if(target==='meetings'){const meetings=w.meetings.filter(m=>m.family_id===id);if(meetings.length===1){openRecord({page:'meetings',id:meetings[0].id});return;}}
  if(target==='tasks'){openRecord({page:'tasks',family:id,kind:w.executionTasks.some(t=>t.family_id===id)?'execution':'analysis'});return;}
  openRecord({page:'families',id,tab:target});
 };
 const focusClientTask=w.profile.role==='client'&&route==='families'&&['questionnaire','documents'].includes(familyTab);
 const recordExists=route==='families'?(!familyId||!!family):route==='tasks'?(!locationState.id||(locationState.kind==='execution'?w.executionTasks:w.analysisTasks).some(t=>t.id===locationState.id)):route==='meetings'?(!locationState.id||w.meetings.some(m=>m.id===locationState.id)):true;
 const available=recordExists&&nav.some(([key])=>key===route)&&!(route==='families'&&familyTab==='tasks'&&!staff);
 const clearFamilyFilter=()=>navigation.go({...locationState,family:undefined},{guard:false});
 const back=()=>navigation.back({page:route==='families'?'families':route==='meetings'?'meetings':'tasks',kind:locationState.kind});
 return <DraftContext.Provider value={drafts}><div className={`app-shell${w.profile.role==='client'?' client-shell':''}${route==='families'&&familyTab==='questionnaire'?' questionnaire-mode':''}${route==='families'&&['questionnaire','documents'].includes(familyTab)?' client-focus-mode':''}${taskMenu?' task-menu-open':''}`}><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();}}>דילוג לתוכן</a><aside className="sidebar"><div className="brand"><BrandLogo mode="dark"/><span>התמונה המלאה של כלכלת המשפחה</span></div>{focusClientTask&&<button type="button" className="mobile-task-menu" aria-expanded={taskMenu} aria-controls="client-task-navigation" onClick={()=>setTaskMenu(open=>!open)}>{taskMenu?'סגירת התפריט':'תפריט ותיק'}<Icon name="family"/></button>}<nav id="client-task-navigation" aria-label="ניווט ראשי">{nav.map(([key,label])=><button key={key} aria-current={(w.profile.role==='client'?clientNavActive(locationState):route)===key?'page':undefined} className={(w.profile.role==='client'?clientNavActive(locationState):route)===key?'active':''} onClick={()=>openRecord(key==='questionnaire'?clientQuestionnaireRoute(w):{page:key as PageName})}><Icon name={key==='families'?'family':key==='questionnaire'?'tasks':key}/>{w.profile.role==='client'&&key==='overview'?'הבית שלי':key==='families'&&w.profile.role==='client'?'התיק שלי':label}</button>)}</nav>{w.profile.role==='client'?<details className="client-account"><summary>{w.profile.name} · החשבון שלי</summary><footer><strong>{w.profile.name}</strong><span>{{admin:'מנהל',representative:'נציג',professional:'בעל מקצוע',client:'לקוח'}[w.profile.role]}</span><AsyncButton action={async()=>{if(!leave())return;const {error}=await backend!.auth.signOut();if(error)throw error;}}>יציאה</AsyncButton></footer></details>:<footer><strong>{w.profile.name}</strong><span>{{admin:'מנהל',representative:'נציג',professional:'בעל מקצוע',client:'לקוח'}[w.profile.role]}</span><AsyncButton action={async()=>{if(!leave())return;const {error}=await backend!.auth.signOut();if(error)throw error;}}>יציאה</AsyncButton></footer>}</aside>
 <div className="main"><header className="topbar"><span>{String(w.settings.system_name||'מסודרים 360')}</span><DraftShelf w={w} open={openRecord}/><AsyncButton action={refresh}>רענון נתונים</AsyncButton></header><main className="content" id="main-content" tabIndex={-1}>{error&&<p className="error" role="alert">{error}</p>}
 {w.familyDirectoryEnabled&&w.profile.role!=='professional'&&familyId&&w.scopedFamilyId!==familyId?<section><p role="status">טוען את תיק המשפחה…</p>{error&&<AsyncButton action={refresh}>ניסיון נוסף בפתיחת התיק</AsyncButton>}</section>:!available?<><h1>הרשומה אינה זמינה</h1><p>הקישור אינו תקין, הרשומה אינה ברשימה שנטענה או שאין לחשבון גישה אליה.</p><button onClick={()=>openRecord({page:'overview'})}>למסך הבית</button></>:<>
 {route==='questionnaire'&&w.profile.role==='client'&&<section className="questionnaire-picker"><p className="eyebrow">השאלונים שלכם</p><h1>באיזה תיק נמשיך?</h1>{w.families.map(f=><button key={f.id} onClick={()=>openFamily(f.id,'questionnaire')}>{f.name} · {f.case_number}</button>)}{!w.families.length&&<Empty>עדיין לא שויך לחשבון תיק משפחה. לאחר השיוך השאלון יופיע כאן.</Empty>}</section>}
 {route==='overview'&&<Overview refresh={refresh} w={w} openFamily={openFamily} navigate={page=>openRecord({page:page as PageName})} openRecord={openRecord} filter={locationState.filter||'all'} onFilter={filter=>navigation.query({filter})}/>}
 {route==='families'&&(family?<FamilyView onSubmitted={()=>{navigation.go({page:'families',id:family.id,tab:'documents'},{replace:true,guard:false});setQuestionnaireDirty(false);}} onDirtyChange={setQuestionnaireDirty} leave={leave} key={family.id} initialTab={familyTab} navigate={tab=>{if(navigation.go({page:'families',id:family.id,tab},{replace:true}))setQuestionnaireDirty(false);}} openRecord={openRecord} family={family} w={w} refresh={refresh} back={back}/>:<><h1>משפחות</h1>{w.familyDirectoryEnabled?<FamilyDirectory query={search} cursor={locationState.cursor} onQuery={setSearch} onPage={cursor=>openRecord({...locationState,cursor})} open={id=>openFamily(id)} version={w}/>:<><Field label="חיפוש משפחה"><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="שם, איש קשר, טלפון, דוא״ל או מספר תיק"/></Field><div className="table-wrap family-table"><table><thead><tr><th>משפחה</th><th>תיק</th><th>מצב</th><th className="family-open-column"/></tr></thead><tbody>{filteredFamilies.map(f=><tr key={f.id}><td><button className="text-button family-open" aria-label={`פתיחת התיק של ${f.name}`} onClick={()=>openFamily(f.id)}>{f.name}</button></td><td>{f.case_number}</td><td><Badge status={f.status}/></td><td className="family-open-column"><button onClick={()=>openFamily(f.id)}>פתיחה</button></td></tr>)}</tbody></table></div>{!w.families.length&&<Empty>עדיין לא שויך לחשבון תיק משפחה.</Empty>}{w.families.length>0&&!filteredFamilies.length&&<div className="empty" role="status"><p>לא נמצאו משפחות שמתאימות לחיפוש. אפשר לחפש לפי שם, איש קשר, טלפון, דוא״ל או מספר תיק.</p><button className="ghost" onClick={()=>setSearch('')}>ניקוי החיפוש</button></div>}{w.families.length>=w.limit&&<p>מוצגים {w.limit} התיקים האחרונים. הרחבת חיפוש דורשת דפדוף בצד השרת.</p>}
</>}
 {staff&&<Panel title="קליטת לקוח חדש"><ol><li>מנהל המערכת מכין חשבון לקוח פעיל ומוודא שהלקוח יכול להיכנס.</li><li>מנהל המערכת פותח תיק ומשייך את חשבון הלקוח ונציג מטפל.</li><li>הנציג מסייע בהשלמת פרטי הקשר והשאלון ובודק את המסמכים.</li></ol><p>אם ללקוח אין חשבון, פנו למנהל המערכת להקמתו לפני פתיחת התיק. קישורי הזמנת סוכן אינם מיועדים ללקוחות.</p>{w.profile.role==='representative'&&<p className="hint">פתיחת התיק במסך זה נעשית על ידי מנהל המערכת. לאחר השיוך התיק יופיע ברשימת המשפחות שלך.</p>}</Panel>}
 {w.profile.role==='admin'&&<Panel title="תיק חדש">{!w.profiles.some(p=>p.role==='client'&&p.active)&&<p className="hint" role="status">אין חשבונות לקוח פעילים לבחירה. יש להשלים הקמת חשבון לקוח לפני פתיחת תיק.</p>}<SaveForm label="פתיחת תיק" save={async d=>{await rpc('rpc_create_family',{p_name:textValue(d,'name'),p_client_profile_id:textValue(d,'client'),p_representative_id:textValue(d,'rep'),p_phone:textValue(d,'phone'),p_email:textValue(d,'email')});await refresh();}}><div className="fields"><Field label="שם המשפחה"><input name="name" required minLength={2} maxLength={150}/></Field><Field label="משתמש לקוח"><select name="client" required><option value="">בחרו…</option>{w.profiles.filter(p=>p.role==='client'&&p.active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="נציג מטפל"><select name="rep" required><option value="">בחרו…</option>{w.representatives.filter(r=>r.active&&(w.profile.role==='admin'||r.profile_id===w.profile.id)).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><Field label="טלפון"><input name="phone" type="tel" required/></Field><Field label="דוא״ל"><input name="email" type="email"/></Field></div></SaveForm></Panel>}</>)}
 {route==='tasks'&&<Tasks selected={locationState.id||''} kind={locationState.kind||'analysis'} onSelect={id=>navigation.go({...locationState,id},{guard:false})} onKind={kind=>navigation.go({...locationState,kind,id:undefined},{replace:true,guard:false})} back={back} key={familyId} familyId={familyId} clearFilter={clearFamilyFilter} leave={leave} openFamily={openFamily} w={w} refresh={refresh}/>}{route==='meetings'&&<Meetings selected={locationState.id||''} onSelect={id=>navigation.go({...locationState,id},{guard:false})} back={back} stage={locationState.stage} topic={locationState.topic} onView={patch=>navigation.query(patch)} openFamily={openFamily} key={familyId} onDirtyChange={setQuestionnaireDirty} leave={leave} w={w} familyId={familyId} clearFilter={clearFamilyFilter} refresh={refresh}/>}{route==='admin'&&w.profile.role==='admin'&&<Admin w={w} refresh={refresh} leave={leave}/>}
 {route==='followups'&&<><header className="page-title"><div><p className="eyebrow">מהשיחה לפעולה</p><h1>מעקב אחרי השיחה</h1></div>{staff&&<button className="primary" onClick={()=>openRecord({page:'meetings',family:familyId||undefined})}>בחירת שיחה להוספת משימה</button>}</header>{familyId&&<p className="filter-notice">המשימות של {w.families.find(f=>f.id===familyId)?.name}<button className="text-button" onClick={()=>openRecord({page:'followups',filter:locationState.filter})}>לכל משימות ההמשך</button></p>}<FollowUps activeFilter={locationState.filter} onFilter={filter=>navigation.query({filter})} openFamily={openFamily} key={familyId} w={w} refresh={refresh} familyId={familyId} onDirtyChange={setQuestionnaireDirty} leave={leave}/></>}{route==='notifications'&&<><h1>התראות</h1><AsyncButton action={async()=>{await rpc('rpc_mark_notifications_read');await refresh();}}>סימון הכול כנקרא</AsyncButton>{!w.notifications.length&&<Empty>אין כרגע התראות. עדכונים על התקדמות הטיפול יופיעו כאן.</Empty>}{w.notifications.map(n=>{const target=notificationTarget(n,w);return <Panel key={n.id} title={n.title}><p>{n.body}</p><small>{n.read_at?'נקרא':'חדש'}</small>{target&&<button onClick={()=>openRecord(target)}>{n.target_kind==='document'?'פתיחת המסמך':'פתיחת הבקשה בתיק'}</button>}</Panel>;})}</>}
 </>}
 </main></div></div></DraftContext.Provider>;
}
