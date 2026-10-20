import {useState} from 'react';
import type {Family} from '../lib/model';
import type {Answers} from './questionnaire-definition';
import {Field} from '../ui';
export function ContactReuse({family,answers,apply}:{family:Family;answers:Answers;apply:(patch:Answers)=>void}){
 const [person,setPerson]=useState('');
 const fields=person?[['phone',family.phone],['email',family.email]].filter(([key,value])=>value&&(person!=='w'||key==='phone')&&!answers[person+'_'+key]):[];
 if(!family.phone&&!family.email)return null;
 return <details className="contact-reuse"><summary>שימוש בפרטי הקשר שכבר קיימים בתיק</summary><p>{family.contact_name||'איש הקשר בתיק'} · <bdi>{family.phone}</bdi> · <bdi>{family.email}</bdi></p><p>הטלפון שבתיק כבר מופיע בשאלון. להשלמת שדות ריקים נוספים, בחרו למי שייכים הפרטים. יועתקו רק טלפון ודוא״ל לשדות ריקים; השדות שכבר מילאתם יישארו כפי שהם.</p><Field label="למי שייכים פרטי הקשר?"><select value={person} onChange={e=>setPerson(e.target.value)}><option value="">בחרו לאחר בדיקה</option><option value="h">{answers.h_first||'לאדם שבחלק ״פרטים אישיים״'}</option>{answers.marital==='married'&&<option value="w">לבן/בת הזוג</option>}</select></Field><button type="button" disabled={!fields.length||(person==='w'&&answers.marital!=='married')} onClick={()=>apply(Object.fromEntries(fields.map(([key,value])=>[person+'_'+key,value])))}>העתקת פרטי הקשר</button></details>;
}
