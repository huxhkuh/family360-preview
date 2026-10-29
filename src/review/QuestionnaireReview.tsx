import {memo,useCallback,useRef,useState} from 'react';
import {BrandLogo} from '../branding/Brand';
import {CHAPTERS} from './questionnaire-definition';
import {allReviewItems,documentReviewEntries,emptyReview,parseReview,reviewEntries,reviewHtml,reviewSummary,REVIEW_STORAGE_KEY,type ReviewDraft,type ReviewEntry,type ReviewItem} from './review-model';
import './review.css';
import isaacReviewRaw from './isaac-review-2026-10-29.json?raw';

function download(name:string,content:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const ReviewCard=memo(function ReviewCard({item,entry,change,index,optionItems=[],entries={}}:{item:ReviewItem;entry?:ReviewEntry;change:(id:string,patch:Partial<ReviewEntry>)=>void;index:number;optionItems?:ReviewItem[];entries?:Record<string,ReviewEntry>}){
 const update=(patch:Partial<ReviewEntry>)=>change(item.id,patch);
 const question=item.kind==='question'||item.kind==='document';
 const id='review-'+item.id.replace(/[^a-z0-9_-]/gi,'-');
 return <article className={'review-card review-card-kind-'+item.kind} data-review-id={item.id} aria-labelledby={id}>
  <header><div><p className="review-kind">{{chapter:'הקדמה לפרק',question:'שאלה',option:'הסבר לאפשרות תשובה',document:'מסמך או הרשאה'}[item.kind]}</p><h3 id={id}>{item.label}</h3></div><div className="review-card-state"><span className="review-current">{item.currentRequirement}</span>{entry?.checked&&<span className="review-done">נבדק</span>}{!entry?.checked&&entry&&<span className="review-done">יש שינויים</span>}</div></header>
  {item.condition&&<p className="review-condition">{item.condition}</p>}
  {item.options&&<p className="review-options-line">{item.options.join(' · ')}</p>}
  {question&&<label className="review-quick">לדעתך, השאלה <select aria-label="לדעתך, מה צריך להיות?" value={entry?.requirement||'undecided'} onChange={e=>update({requirement:e.target.value as ReviewEntry['requirement']})}><option value="undecided">טרם החלטתי</option><option value="required">חובה</option><option value="optional">רשות</option><option value="remove">מציע להסיר</option></select></label>}
  {entry?.notes&&<p className="review-existing-note"><strong>הערה לדיון:</strong> {entry.notes}</p>}
  <details className="review-details"><summary>הערות ושינוי ניסוח</summary>
   {item.sectionTitle&&<p className="review-context">{item.chapterTitle} · {item.sectionTitle}</p>}
   {item.decision&&<p className="review-decision">{item.decision}</p>}
   <div className="review-editors">
    <label>ניסוח השאלה או הכותרת<textarea aria-label="ניסוח השאלה או הכותרת" rows={2} maxLength={12000} value={entry?.wording??item.label} onChange={e=>update({wording:e.target.value})}/></label>
    <label>הסבר — מה הכוונה?<textarea aria-label="הסבר — מה הכוונה?" rows={3} maxLength={12000} value={entry?.meaning??item.meaning} onChange={e=>update({meaning:e.target.value})}/></label>
    <label>{item.kind==='document'?'איפה מוצאים ומה עושים אם אין?':'הנחיה — איך עונים ואיפה בודקים?'}<textarea aria-label={item.kind==='document'?'איפה מוצאים ומה עושים אם אין?':'הנחיה — איך עונים ואיפה בודקים?'} rows={3} maxLength={12000} value={entry?.guidance??item.guidance} onChange={e=>update({guidance:e.target.value})}/></label>
    {(item.example||entry?.example!==undefined)&&<label>דוגמה או תקופה<textarea aria-label="דוגמה או תקופה" rows={2} maxLength={12000} value={entry?.example??item.example??''} onChange={e=>update({example:e.target.value})}/></label>}
    {(item.more||entry?.more!==undefined)&&<label>הסבר נוסף<textarea aria-label="הסבר נוסף" rows={3} maxLength={12000} value={entry?.more??item.more??''} onChange={e=>update({more:e.target.value})}/></label>}
    <label className="review-notes">הערות לדיון — מה צריך לתקן, להוסיף או לברר?<textarea aria-label="הערות לדיון — מה צריך לתקן, להוסיף או לברר?" rows={3} maxLength={12000} value={entry?.notes||''} placeholder="אפשר להעיר גם על אפשרויות התשובה, התנאים והצורך במידע" onChange={e=>update({notes:e.target.value})}/></label>
   </div>
   <label className="review-check"><input type="checkbox" checked={entry?.checked||false} onChange={e=>update({checked:e.target.checked})}/>סיימתי לבדוק את הסעיף הזה</label>
   {optionItems.length>0&&<details className="review-option-group"><summary>הסברים לאפשרויות התשובה ({optionItems.length})</summary>{optionItems.map(option=><ReviewCard key={option.id} item={option} entry={entries[option.id]} change={change} index={0}/>)}</details>}
  </details>
 </article>;
});

export default function QuestionnaireReview({onHome}:{onHome:()=>void}){
 const [initial]=useState(()=>{try{const raw=localStorage.getItem(REVIEW_STORAGE_KEY);return {draft:raw?parseReview(raw):parseReview(isaacReviewRaw),error:''};}catch{return {draft:emptyReview(),error:'לא הצלחנו לקרוא הערות שמורות בדפדפן. אפשר לייבא קובץ הערות; אין שמירה חדשה עד שמתחילים לערוך.'};}});
 const [draft,setDraft]=useState(initial.draft),latest=useRef(draft),[status,setStatus]=useState(''),[error,setError]=useState(initial.error);
 const input=useRef<HTMLInputElement>(null);
 const save=useCallback((next:ReviewDraft)=>{latest.current=next;setDraft(next);try{localStorage.setItem(REVIEW_STORAGE_KEY,JSON.stringify(next));setError('');setStatus('השינויים נשמרו בדפדפן הזה.');}catch{setStatus('השינויים נמצאים במסך.');setError('השמירה בדפדפן לא הצליחה. הורידו קובץ הערות כדי לשמור עותק.');}},[]);
 const change=useCallback((id:string,patch:Partial<ReviewEntry>)=>{const current=latest.current;save({...current,updatedAt:new Date().toISOString(),entries:{...current.entries,[id]:{...current.entries[id],...patch}}});},[save]);
 const summary=reviewSummary(draft);
 const primaryItems=allReviewItems.filter(item=>item.kind==='question'||item.kind==='document');
 const checkedPrimary=primaryItems.filter(item=>draft.entries[item.id]?.checked).length;
 async function importFile(file?:File){if(!file)return;try{if(file.size>5_000_000)throw Error('קובץ ההערות גדול מדי.');const incoming=parseReview(await file.text());if(summary.edited&&!confirm('ייבוא הקובץ יחליף את ההערות שבמסך. כדאי להוריד אותן קודם. להחליף?'))return;save(incoming);setStatus('קובץ ההערות נטען.');}catch{setError('לא ניתן לייבא את הקובץ. נדרש קובץ הערות מתאים; ההערות הקיימות נשארו ללא שינוי.');}finally{if(input.current)input.current.value='';}}
 return <main className="questionnaire-review-page" dir="rtl">
  <header className="review-header"><BrandLogo/><button onClick={onHome}>חזרה לדף הבית</button></header>
  <section className="review-intro"><p className="review-kicker">לעבודה משותפת עם יצחק</p><h1>עוברים על כל השאלון</h1><p>כל השאלות מופיעות ברצף. אפשר לסמן חובה או רשות ליד כל שאלה, ולפתוח הערות או תיקון ניסוח רק כשצריך.</p><p><strong>ההערות הן הצעות לבדיקה. הן אינן משנות את שאלון הלקוחות.</strong> המסמכים והנושאים שעדיין לא הוכרעו מסומנים ליד הסעיף המתאים.</p><label>שם הבודק<input autoComplete="name" maxLength={100} value={draft.reviewer} onChange={e=>save({...latest.current,reviewer:e.target.value,updatedAt:new Date().toISOString()})}/></label><p>מוצגות הערות יצחק מ־29.10, אלא אם קיימת בדפדפן זה טיוטה שמורה. ניתן לטעון מחדש את ההערות המקוריות בסרגל למטה.</p><p className="review-storage">שמירה אוטומטית בדפדפן הזה בלבד. להעברה למחשב אחר או לשליחת ההערות, מורידים קובץ. אין סנכרון אוטומטי בין מחשבים.</p></section>
  <section className="review-toolbar" aria-label="שמירת ההערות והתקדמות"><span>{checkedPrimary} שאלות ומסמכים נבדקו · {summary.edited} סעיפים נערכו</span><div><button className="primary" onClick={()=>{download('questionnaire-review.json',JSON.stringify(latest.current,null,2),'application/json;charset=utf-8');setStatus('קובץ ההערות הורד. אפשר להעביר אותו ולייבא במחשב אחר.');}}>הורדת קובץ הערות</button><button onClick={()=>download('questionnaire-review.html',reviewHtml(latest.current),'text/html;charset=utf-8')}>הורדת סיכום לקריאה</button><button onClick={()=>input.current?.click()}>ייבוא הערות</button><button onClick={()=>{if(!confirm('טעינת ההערות המקוריות תחליף את הטיוטה הנוכחית בדפדפן. מומלץ להוריד אותה קודם. להמשיך?'))return;save(parseReview(isaacReviewRaw));setStatus('ההערות המקוריות של יצחק נטענו.');}}>טעינת הערות יצחק המקוריות</button><button onClick={()=>window.print()}>הדפסה</button><input ref={input} aria-label="קובץ הערות לייבוא" type="file" accept=".json,application/json" hidden onChange={e=>void importFile(e.target.files?.[0])}/></div></section>
  <p className="review-status" role="status">{status||'אפשר להתחיל לבדוק. ההערות יישמרו בזמן העריכה.'}</p>{error&&<p className="review-error" role="alert">{error}</p>}
  <nav className="review-navigation" aria-label="קפיצה לפרק בביקורת">{CHAPTERS.map(c=><a key={c.key} href={'#review-'+c.key} onClick={e=>{e.preventDefault();document.getElementById('review-'+c.key)?.scrollIntoView({behavior:'auto',block:'start'});}}>{c.title}</a>)}<a href="#review-documents" onClick={e=>{e.preventDefault();document.getElementById('review-documents')?.scrollIntoView({behavior:'auto'});}}>מסמכים והרשאות</a></nav>
  {CHAPTERS.map(c=><section className="review-chapter" id={'review-'+c.key} key={c.key} aria-label={'ביקורת — '+c.title}><h2>{c.title}</h2>{reviewEntries.filter(item=>item.chapter===c.key&&item.kind!=='option').map(item=><ReviewCard key={item.id} item={item} index={allReviewItems.indexOf(item)} entry={draft.entries[item.id]} entries={draft.entries} optionItems={reviewEntries.filter(option=>option.kind==='option'&&option.id.startsWith(item.id+':option:'))} change={change}/>)}</section>)}
  <section className="review-chapter" id="review-documents" aria-label="ביקורת — מסמכים והרשאות"><h2>מסמכים והרשאות</h2><p>עצם קיומה של שאלה אינו דורש מסמך. כאן בודקים רק את סוגי המסמכים שכבר הוגדרו ואת ההחלטות שנמסרו; אין דרישה חדשה למסמך לכל חיסכון או ביטוח.</p>{documentReviewEntries.map(item=><ReviewCard key={item.id} item={item} index={allReviewItems.indexOf(item)} entry={draft.entries[item.id]} change={change}/>)}</section>
  <footer className="review-footer"><p>{checkedPrimary} שאלות ומסמכים סומנו כנבדקו. אפשר להמשיך מאוחר יותר באותו דפדפן או להעביר את קובץ ההערות.</p><button className="primary" onClick={()=>download('questionnaire-review.json',JSON.stringify(latest.current,null,2),'application/json;charset=utf-8')}>הורדת קובץ הערות</button></footer>
 </main>;
}
