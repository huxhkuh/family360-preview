import {QuestionnaireDiscussion} from '../families/QuestionnaireDiscussion';
import {useRetainedState} from '../lib/draft-guard';
import type {Family,Meeting,Workspace} from '../lib/model';
import {ContactDetails} from '../families/ContactDetails';
import {ActivityFeed} from '../families/ActivityFeed';
import {ResourceLibrary} from '../resources/ResourceLibrary';
import {Badge} from '../ui';
export function CallContext({w,family,meeting,refresh}:{w:Workspace;family:Family;meeting:Meeting;refresh:()=>Promise<void>}){
 const [tab,setTab]=useRetainedState('call-context:'+meeting.id,()=> '');
 const representative=w.representatives.find(r=>r.id===family.representative_id);
 const options=[['discussion','נושאים מהשאלון'],['contact','פרטי קשר'],...(w.activityFeedEnabled?[['activity','היסטוריית התיק']]:[]),...(w.resourceLibraryEnabled?[['resources','קישורים שימושיים']]:[])];
 return <section className="call-context" aria-label="הקשר המשפחה בזמן השיחה"><div className="call-context-summary"><div><small>איש קשר</small><strong>{family.contact_name||'טרם הוגדר'}</strong></div><div><small>טלפון</small><strong dir="ltr">{family.phone||'טרם הוזן'}</strong></div><div><small>נציג מטפל</small><strong>{representative?.name||'טרם שויך'}</strong></div><div><small>מצב התיק</small><Badge status={family.status}/></div></div>
 <div className="context-actions">{options.map(([key,label])=><button key={key} className={tab===key?'selected':'ghost'} aria-expanded={tab===key} aria-controls="call-context-panel" onClick={()=>setTab(tab===key?'':key)}>{label}</button>)}</div>
 {tab&&<div id="call-context-panel" className="context-panel"><div className="section-heading"><p className="muted">המידע נפתח לצד העבודה בשיחה. אין צורך לצאת מהנושא.</p><button className="ghost" onClick={()=>setTab('')}>קיפול פרטי התיק</button></div>{tab==='discussion'&&<QuestionnaireDiscussion family={family} refresh={refresh}/>} {tab==='contact'&&<ContactDetails key={family.id} family={family} staff refresh={refresh} compact/>}{tab==='activity'&&<ActivityFeed familyId={family.id} version={w} open={()=>{setTab('activity');}} hideNavigation/>}{tab==='resources'&&<ResourceLibrary version={w}/>}</div>}
 </section>;
}
