import type {Family,Workspace} from '../lib/model';
import {employmentValues} from '../lib/employment';
import {CHAPTERS,hasCurrentPartner} from '../families/questionnaire-definition';
import {Badge} from '../ui';
import './call-reference.css';

const fields=CHAPTERS.flatMap(chapter=>chapter.secs.flatMap(section=>section.fields||[]));
const text=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim():'טרם נמסר';
function answerLabel(key:string,value:unknown){
 const options=fields.find(field=>field.k===key)?.opts;
 if(!options)return text(value);
 const values=key.endsWith('_emp')?employmentValues(value):typeof value==='string'?[value]:[];
 if(!values.length)return 'טרם נמסר';
 return values.map(value=>options.find(([key])=>key===value)?.[1]||'נדרש בירור').join(' · ');
}

export function CallReference({family,w}:{family:Family;w:Workspace}){
 if(!['admin','representative'].includes(w.profile.role))return null;
 const answers=family.answers||{};
 const documents=w.documents.filter(document=>document.family_id===family.id);
 const needsDocument=(status:string)=>['missing','rejected'].includes(status);
 const missing=documents.filter(document=>needsDocument(document.status)).length;
 const facts=[
  ['יישוב',text(answers.city)],
  ['מצב משפחתי',answerLabel('marital',answers.marital)],
  ['מגורים',answerLabel('housing',answers.housing)],
  ['תעסוקה',answerLabel('h_emp',answers.h_emp)],
  ...(hasCurrentPartner(answers)?[['תעסוקת בת הזוג',answerLabel('w_emp',answers.w_emp)]]:[]),
 ];
 return <details className="call-reference">
  <summary>פרטי המשפחה והמסמכים{missing>0&&<span className="call-reference-missing">{missing} מסמכים להשלמה</span>}</summary>
  <div className="call-reference-content">
   <section aria-label="פרטי המשפחה לעיון">
    <h3>המשפחה בשיחה</h3>
    <dl className="call-reference-facts">
     <div><dt>מספר תיק</dt><dd>{text(family.case_number)}</dd></div>
     <div><dt>איש קשר</dt><dd>{text(family.contact_name)}</dd></div>
     <div><dt>טלפון</dt><dd><bdi dir="ltr">{text(family.phone)}</bdi></dd></div>
     <div><dt>דוא״ל</dt><dd><bdi dir="ltr">{text(family.email)}</bdi></dd></div>
    </dl>
    <h3>מתוך השאלון</h3>
    <dl className="call-reference-facts">{facts.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {family.internal_notes?.trim()&&<details className="call-reference-notes"><summary>דגשים פנימיים לצוות</summary><p>{family.internal_notes}</p></details>}
   </section>
   <section aria-label="מצב המסמכים בשיחה">
    <h3>המסמכים בתיק</h3>
    <p className="muted">{documents.length?`${documents.length} מסמכים בתיק · ${missing?`${missing} להשלמה`:'אין מסמכים שמסומנים כחסרים או נדחו'}`:'עדיין אין מסמכים בתיק.'}</p>
    {documents.length>0&&<ul className="call-reference-documents">{[...documents].sort((a,b)=>Number(needsDocument(b.status))-Number(needsDocument(a.status))||a.name.localeCompare(b.name,'he')).map(document=><li key={document.id}>
     <div><strong>{document.name}</strong>{document.status==='rejected'&&document.reject_reason&&<p>{document.reject_reason}</p>}</div><Badge status={document.status}/>
    </li>)}</ul>}
   </section>
  </div>
 </details>;
}
