import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';

export const concepts=[
 {id:1,name:'מדרגות לתמונה מלאה',idea:'פרטים קטנים מסתדרים לכדי תמונה אחת.',detail:'שישה אריחים מדורגים וקו מסגרת פתוח. הקשר הברור ביותר למותג מסודרים, עם חתימה חדשה למערכת 360.'},
 {id:2,name:'התמונה השלמה',idea:'מקום אחד לכל חלקי החיים הכלכליים.',detail:'ארבע פינות אוספות את המבט אל מרכז נחושתי. סימן מדויק ושקט שמלווה את המעבר מהפרטים לתמונה המלאה.'},
 {id:3,name:'דרך של ביטחון',idea:'מתקדמים יחד, שלב אחרי שלב.',detail:'קו אדריכלי רציף בשלושה מפלסים. תחושה של תהליך מסודר ובסיס יציב, עם נוכחות חזקה גם בגודל קטן.'},
 {id:4,name:'חיבור משפחתי',idea:'המשפחה והליווי המקצועי, בחיבור אחד.',detail:'שתי קשתות משתלבות ומחזיקות זו את זו. החלופה הרכה והאנושית ביותר, שמתאימה לשירות אישי לאורך זמן.'},
 {id:5,name:'מבט 360 · הכיוון הנבחר',idea:'עושים לך סדר בכסף.',detail:'הסמל שבחרתם, בגרסה מדויקת: מעגל פתוח, מקטע נחושת ושלושה ריבועים מדורגים. הסמל מעל השם והסלוגן מתחתיו.',recommended:true},
] as const;
const valid=(value:unknown)=>[1,2,3,4,5].includes(Number(value))?Number(value):1;
const initial=()=>{
 const query=new URLSearchParams(location.search).get('brand');
 if(query)return valid(query);
 try{return valid(localStorage.getItem('mesudarim360:brand:stacked')||5);}catch{return 5;}
};
const BrandContext=createContext({variant:1,select:(_value:number)=>{}});
export const useBrand=()=>useContext(BrandContext);
export const brandAsset=(variant:number,mode:'light'|'dark'|'mono'='light',mark=false)=>`${import.meta.env.BASE_URL}brand/concept-${valid(variant)}-${mode}${mark?'-mark':''}.svg`;
export function BrandProvider({children}:{children:ReactNode}){
 const [variant,select]=useState(initial);
 useEffect(()=>{
  try{localStorage.setItem('mesudarim360:brand:stacked',String(variant));}catch{/* Branding still works when storage is blocked. */}
  const icon=document.querySelector<HTMLLinkElement>('link[rel=icon]');if(icon)icon.href=brandAsset(variant,'light',true);
 },[variant]);
 return <BrandContext.Provider value={{variant,select}}>{children}</BrandContext.Provider>;
}
export function BrandLogo({variant,mode='light',mark=false,className=''}:{variant?:number;mode?:'light'|'dark'|'mono';mark?:boolean;className?:string}){
 const brand=useBrand();
 const selected=variant||brand.variant;
 return <img className={`mesudarim-logo${mark?' brand-mark':selected===5?' brand-stacked':''} ${className}`} src={brandAsset(selected,mode,mark)} alt={selected===5&&!mark?'מסודרים 360 — עושים לך סדר בכסף.':'מסודרים 360'} width={mark?64:320} height={mark?64:selected===5?242:76}/>;
}
export function BrandControls({open,onOpen}:{open:boolean;onOpen:()=>void}){
 const {variant,select}=useBrand();
 return <div className="brand-controls"><label><span>לוגו</span><select aria-label="חלופת לוגו" value={variant} onChange={e=>select(Number(e.target.value))}>{concepts.map(c=><option key={c.id} value={c.id}>{c.id} · {c.name}</option>)}</select></label><button className="brand-lab-toggle" aria-expanded={open} aria-controls="brand-lab" onClick={onOpen}>{open?'חזרה לדמו':'חמש חלופות למיתוג'}</button></div>;
}
export function BrandLab({onPreview,onClose}:{onPreview:(variant:number,page:'home'|'questionnaire')=>void;onClose:()=>void}){
 const {variant,select}=useBrand();
 return <main id="brand-lab" className="brand-lab" tabIndex={-1}>
  <header className="brand-lab-heading"><div><p className="eyebrow">מסודרים 360 / מחקר זהות / חמש חלופות</p><h1>אותו בית.<br/><em>חמש חתימות.</em></h1><p>ירוק יער עמוק, נחושת ושמנת. חמש דרכים לתת למערכת אופי משלה, בתוך המשפחה של מסודרים.</p></div><div className="brand-lab-note"><span>01 — 05</span><p>בחרו חתימה וראו אותה בתוך מסך הבית והשאלון הפעילים. החלפת הלוגו שומרת על התשובות ועל מקום העבודה.</p><button onClick={onClose}>להמשך ההתנסות ←</button></div></header>
  <section className="chosen-brand" aria-label="הלוגו המעודכן">
   <div className="chosen-brand-art"><BrandLogo variant={5} mode="dark"/></div>
   <div className="chosen-brand-description"><p className="eyebrow">הכיוון שבחרתם / גרסה מעודכנת</p><h2>עושים לך סדר בכסף.</h2><p>המעגל הפתוח ושלושת הריבועים, עם הסמל מעל השם. ירוק עמוק בכמה גוונים, נחושת חמה ומרווח לנשום.</p><div className="concept-actions"><button className="primary" onClick={()=>onPreview(5,'home')}>פתיחת הבית עם הלוגו החדש ←</button><button onClick={()=>onPreview(5,'questionnaire')}>פתיחת השאלון עם הלוגו החדש ←</button></div></div>
  </section>
  <section className="brand-palette" aria-label="צבעי המותג"><span><i style={{background:'#031E1A'}}/>יער עמוק <code>#031E1A</code></span><span><i style={{background:'#D8A16E'}}/>נחושת <code>#D8A16E</code></span><span><i style={{background:'#F9ECE0'}}/>שמנת <code>#F9ECE0</code></span><p>נחושת להדגשה; ירוק עמוק לטקסט ולפעולות.</p></section>
  <div className="brand-concepts">{concepts.map(c=><article key={c.id} className={`brand-concept${variant===c.id?' is-selected':''}`}>
   <header><span className="concept-number">0{c.id}</span><h2>{c.name}</h2>{'recommended' in c&&<span className="brand-recommendation">הכיוון המומלץ</span>}</header>
   <div className="concept-primary"><BrandLogo variant={c.id}/>{c.id!==5&&<p>התמונה המלאה של כלכלת המשפחה</p>}</div>
   <div className="concept-applications"><div className="on-forest"><BrandLogo variant={c.id} mode="dark"/></div><div className="on-paper"><BrandLogo variant={c.id} mode="mono" mark/><small>סמל בצבע אחד</small></div></div>
   <div className="concept-copy"><h3>{c.idea}</h3><p>{c.detail}</p><div className="concept-actions"><button className={variant===c.id?'primary':''} aria-pressed={variant===c.id} onClick={()=>select(c.id)}>{variant===c.id?'הלוגו הנבחר ✓':'בחירת הלוגו'}</button><button onClick={()=>onPreview(c.id,'home')}>במסך הבית ←</button><button onClick={()=>onPreview(c.id,'questionnaire')}>בשאלון ←</button></div></div>
  </article>)}</div>
  <footer className="brand-lab-footer"><p>כל החלופות הן SVG וקטורי, כולל האותיות — חדות גם בהקטנה ובלי תלות בטעינת גופן. זהו מרחב בחירה מקומי; נתוני הדמו נשארים מדומים.</p><button onClick={onClose}>חזרה לדמו עם הלוגו הנבחר ←</button></footer>
 </main>;
}
