import type {Document,Family,Workspace} from '../lib/model';
import type {Destination} from '../lib/workflow';
import type {RouteState} from '../lib/navigation';
import {Icon} from '../icons';
import {DocumentStatus} from '../families/DocumentStatus';

export function ClientDocuments({documents,familyId,open}:{documents:Document[];familyId:string;open:(r:RouteState)=>void}){
 return <section className="client-document-list"><header><p className="eyebrow">התיק המשפחתי</p><h2>המסמכים שלנו</h2></header>{!documents.length&&<p>מסמכים ובקשות לצירוף יופיעו כאן.</p>}{documents.map(doc=><article key={doc.id} data-record-id={doc.id} data-document-required={!doc.optional} data-document-type={doc.type} className={`document client-document-row${['missing','rejected'].includes(doc.status)?' awaiting-document':''}`}><span className="client-document-icon"><Icon name="documents"/></span><div><h3>{doc.name}</h3><p>{doc.reject_reason||doc.purpose||doc.period||''}</p></div><DocumentStatus doc={doc}/><button className="ghost" onClick={()=>open({page:'families',id:familyId,tab:'documents',focus:doc.id})}>{['missing','rejected'].includes(doc.status)?'השלמה':'צפייה'}<span className="sr-only"> — {doc.name}</span></button></article>)}</section>;
}

export function ClientCaseHeader({family,w,tab,change,open,back}:{family:Family;w:Workspace;tab:Destination;change:(tab:Destination)=>void;open:(r:RouteState)=>void;back:()=>void}){
 const owner=w.representatives.find(r=>r.id===family.representative_id)?.name;

 return <><header className="client-case-hero"><div className="client-case-title"><p>{family.name} / <bdi>{family.case_number}</bdi></p><h1>התיק שלנו<span>.</span></h1><p>כל המידע המשפחתי שלכם במקום אחד.</p><button className="client-case-back" onClick={back}>חזרה למסך הקודם ←</button></div><button className="client-case-advisor" onClick={()=>open({page:'help',family:family.id})}><Icon name="help"/><span><strong>{owner||'הליווי שלכם'}</strong><small>הנציג שלכם</small></span><span>יצירת קשר</span></button></header><ClientFolderTabs tab={tab} change={change}/></>;
}

export function ClientReports({w,familyId,open}:{w:Workspace;familyId:string;open:(r:RouteState)=>void}){
 const reports=w.finalReports.filter(r=>r.family_id===familyId&&r.status==='approved'&&r.snapshot);
 return <section className="client-reports"><p className="eyebrow">התיק המשפחתי</p><h2>הדוחות שלנו</h2>{reports.length?reports.map(r=><article key={r.id}><Icon name="report"/><div><h3>דוח סיכום הטיפול</h3><p>{r.snapshot?.approved_at?new Date(r.snapshot.approved_at).toLocaleDateString('he-IL'):'אושר על ידי הנציג'}</p></div><button onClick={()=>open({page:'meetings',id:r.meeting_id,stage:'summary'})}>פתיחת הדוח</button></article>):<p>דוח שאושר על ידי הנציג יופיע כאן.</p>}</section>;
}

export function ClientFolderTabs({tab,change}:{tab:Destination;change:(tab:Destination)=>void}){
 const tabs:[Destination,string,string][]=[['documents','מסמכים','documents'],['questionnaire','המשפחה','questionnaire'],['followups','פעולות','tasks'],['services','בטיפול','services'],['meetings','שיחות','meetings'],['reports','דוחות','report'],['overview','פרטי התיק','account']];
 return <nav className="tabs client-folder-tabs" aria-label="תוכן תיק המשפחה">{tabs.map(([key,label,icon])=><button key={key} aria-current={tab===key?'page':undefined} className={tab===key?'selected':'ghost'} onClick={()=>change(key)}><Icon name={icon}/>{label}</button>)}</nav>;
}
