import {demoTopic,resetDemoTopics} from './demo-topic';
import {invalidatePreparation} from './preparation-cache';
import {briefInput} from './brief-context';
import {fieldLabels,type AiJob,type AiState,type AiSource,type Extraction} from './contracts';
import type {Workspace} from '../lib/model';

const jobs=new Map<string,AiJob>();
export const resetDemoAi=()=>{jobs.clear();resetDemoTopics();invalidatePreparation();};
const extraction:Extraction={kind:'payslip',owner:'ישראל לדוגמה',period:'09/2026',pages:[{page:1,text:'מסמך סינתטי להדגמה בלבד\nישראל לדוגמה\nתקופה 09/2026\nמעסיק: חברה לדוגמה\nשכר ברוטו 12,000 ₪\nשכר נטו 9,250 ₪\nהפרשת עובד לפנסיה 720 ₪'}],fields:[{key:'gross_salary',value:'12,000',unit:'ILS',owner:'ישראל לדוגמה',period:'09/2026',page:1,quote:'שכר ברוטו 12,000 ₪'},{key:'net_salary',value:'9,250',unit:'ILS',owner:'ישראל לדוגמה',period:'09/2026',page:1,quote:'שכר נטו 9,250 ₪'},{key:'employee_deposit',value:'720',unit:'ILS',owner:'ישראל לדוגמה',period:'09/2026',page:1,quote:'הפרשת עובד לפנסיה 720 ₪'}],warnings:['זו קריאה לדוגמה; הקובץ המקורי לא נשלח לספק AI.']};
function pensionExample():Extraction{return {kind:'pension',owner:'ישראל לדוגמה',period:'2025',pages:[{page:1,text:'מסמך סינתטי להדגמה בלבד\nישראל לדוגמה\nדוח שנתי 2025\nיתרה צבורה 120,000 ₪\nדמי ניהול מצבירה 0.20%\nדמי ניהול מהפקדות 1.50%'}],fields:[{key:'balance',value:'120,000',unit:'ILS',owner:'ישראל לדוגמה',period:'2025',page:1,quote:'יתרה צבורה 120,000 ₪'},{key:'balance_fee',value:'0.20',unit:'percent',owner:'ישראל לדוגמה',period:'2025',page:1,quote:'דמי ניהול מצבירה 0.20%'},{key:'deposit_fee',value:'1.50',unit:'percent',owner:'ישראל לדוגמה',period:'2025',page:1,quote:'דמי ניהול מהפקדות 1.50%'}],warnings:['מסמך סינתטי להדגמת בדיקת הנתונים.']};}
export function demoAi(name:string,a:Record<string,any>,w:Workspace){
 if(!name.startsWith('rpc_ai_'))return undefined;
 if(['rpc_ai_assist_topic','rpc_ai_topic_assistance'].includes(name))return demoTopic(name,a,w);
 const staff=['admin','representative'].includes(w.profile.role);const deny=()=>{throw Error('PERMISSION_DENIED');};
 const result=(job:AiJob|null):AiState=>({configured:true,job:job?structuredClone(job):null});
 if(name==='rpc_ai_review_field'){
  if(!staff)return deny();const job=jobs.get(a.p_job_id);if(!job||job.kind!=='document')return deny();if(a.p_expected_revision!==job.revision)throw Error('CONFLICT');const field=(job.result as Extraction).fields[Number(String(a.p_field_id).slice(6))-1];if(!field||a.p_checked!==true||!['confirmed','rejected'].includes(a.p_status)||typeof a.p_value!=='string'||!a.p_value.trim()||a.p_value.length>500||(a.p_value!==field.value&&String(a.p_note||'').trim().length<3))throw Error('VALIDATION');
  const review={field_id:a.p_field_id,value:a.p_value,status:a.p_status,note:a.p_note||'',reviewed_by:w.profile.id,reviewed_at:new Date().toISOString()};job.reviews=job.reviews.filter(r=>r.field_id!==review.field_id).concat(review);job.revision++;job.updated_at=review.reviewed_at;return result(job);
 }
 if(name==='rpc_ai_document'||name==='rpc_ai_read_document'){
  const doc=w.documents.find(d=>d.id===a.p_document_id);if(!doc||w.profile.role==='professional'||w.profile.role==='marketer')return deny();const key='demo-document:'+doc.id;let job=jobs.get(key)||null;
  if(name==='rpc_ai_read_document'){
   if(!staff)return deny();if(!['pending','approved'].includes(doc.status))throw Error('AI_NO_FILE');
   if(!job){const at=new Date().toISOString();job={id:key,kind:'document',status:'review',revision:1,result:doc.key.includes('pension')?pensionExample():structuredClone(extraction),reviews:[],sources:[],error_code:null,created_at:at,updated_at:at,demo:true};jobs.set(key,job);}
  }
  return staff?result(job):result(job?{...job,result:null,reviews:[],sources:[]}:null);
 }
 if(name==='rpc_ai_brief'||name==='rpc_ai_prepare_brief'){
  if(!staff)return deny();if(!w.families.some(f=>f.id===a.p_family_id))return deny();const facts:AiSource[]=[];
  for(const doc of w.documents.filter(d=>d.family_id===a.p_family_id&&d.status==='approved')){const job=jobs.get('demo-document:'+doc.id);if(job)for(const r of job.reviews.filter(r=>r.status==='confirmed')){const f=(job.result as Extraction).fields[Number(r.field_id.slice(6))-1];facts.push({id:'d:'+doc.id+':'+r.field_id,label:fieldLabels[f.key],value:r.value,kind:'document',document_id:doc.id,page:f.page,quote:f.quote});}}
  const input=briefInput(w,a.p_family_id,facts),key='demo-brief:'+a.p_family_id;let job=jobs.get(key)||null;
  if(job&&JSON.stringify(job.input)!==JSON.stringify(input))job={...job,status:'stale'};
  if(name==='rpc_ai_prepare_brief'&&(!job||job.status==='stale')){
   const at=new Date().toISOString(),first=input.sources[0];job={id:key,kind:'brief',status:'ready',revision:(job?.revision||0)+1,result:{summary:[{text:input.sources.some(s=>s.kind==='document')?'בתיק יש נתונים שאומתו מול מסמך, לצד תשובות שהמשפחה מסרה. יש לברר את ההבדלים לפני הסבר ההמשך.':'ההכנה מתבססת על תשובות המשפחה והמצב המתועד בתיק. יש לאמת את הפרטים שדרושים להמשך.',sources:input.sources.slice(0,3).map(s=>s.id)}],topics:input.topics.map(t=>({key:t.key,relevance:'clarify',reason:{text:'יש לברר עם המשפחה את הרלוונטיות ואת המצב העדכני לפני קבלת החלטה בנושא.',sources:[first.id]},ask:t.question,explain:t.explain,needs:t.needs}))},reviews:[],sources:input.sources,input,error_code:null,created_at:at,updated_at:at,demo:true};jobs.set(key,job);
  }
  return result(job);
 }
 throw Error('DEMO_UNAVAILABLE');
}
export function demoDocumentSource(documentId:string){
 const result=(jobs.get('demo-document:'+documentId)?.result||extraction) as Extraction;
 const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const rows=result.pages[0].text.split('\n');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="660" height="860"><rect width="660" height="860" fill="#fffdf6"/><rect x="40" y="40" width="580" height="780" fill="none" stroke="#d8d7c8"/><g direction="rtl" text-anchor="start" fill="#214a35" font-family="Arial">'+rows.map((text,i)=>'<text x="590" y="'+(110+i*65)+'" font-size="'+(i===0?'18':'25')+'">'+escape(text)+'</text>').join('')+'</g></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
