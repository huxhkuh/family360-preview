import type {Family} from '../lib/model';
import {Panel,SaveForm,Field,textValue} from '../ui';
import {rpc} from '../lib/backend';
import {questionnaireDiscussion} from './questionnaire-discussion';
export function QuestionnaireDiscussion({family,refresh}:{family:Family;refresh:()=>Promise<void>}){
 const topics=questionnaireDiscussion(family.answers||{});
 const reviewed=(key:string,token:string)=>family.questionnaire_reviews?.[key]?.token===token;
 const count=topics.filter(t=>!reviewed(t.key,t.token)).length;
 return <Panel title={`נושאים מהשאלון לשיחה · ${count} לבירור`}><p>״אין״ היא תשובה, ו״לא יודעים״ מציינת מידע שצריך לברר. עברו על הנושאים עם המשפחה ותעדו מה סוכם. התיעוד אינו משנה את תשובות הלקוח.</p>
 {!topics.length&&<p>לא עלו כרגע נושאים מהרשימה הזו. אפשר לעבור גם על השאלון המלא.</p>}
 {topics.map(t=><details key={t.key} className="discussion-topic"><summary>{reviewed(t.key,t.token)?'✓ נבדק בשיחה':'לבירור'} · {t.label}</summary><p><strong>{t.chapter}</strong> · תשובת הלקוח: {t.value}</p>{family.questionnaire_reviews?.[t.key]&&<p>תיעוד קודם: {family.questionnaire_reviews[t.key].note}{!reviewed(t.key,t.token)&&' · התשובה השתנתה מאז התיעוד; יש לברר שוב.'}</p>}<SaveForm key={t.token} label="שמירת סיכום הבירור" save={async data=>{await rpc('rpc_review_questionnaire_topic',{p_family_id:family.id,p_key:t.key,p_token:t.token,p_note:textValue(data,'note'),p_expected_updated_at:family.updated_at});await refresh();}}><Field label="מה התברר או סוכם בשיחה?"><textarea name="note" required minLength={3} maxLength={1000} defaultValue={family.questionnaire_reviews?.[t.key]?.note||''}/></Field></SaveForm></details>)}
 </Panel>;
}
