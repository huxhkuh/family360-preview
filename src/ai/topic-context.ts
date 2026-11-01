import type {Workspace} from '../lib/model';
import {conversationDeck,guidedChoices,savingsEvidence} from '../meetings/conversation-guide';
import {briefInput} from './brief-context';
import type {AiSource} from './contracts';
import type {TopicAction,TopicInput} from './topic-contracts';

export function topicInput(w:Workspace,meetingId:string,topicKey:string,action:TopicAction,notes:string,documentFacts:AiSource[]=[]):TopicInput{
 const meeting=w.meetings.find(m=>m.id===meetingId);if(!meeting)throw Error('PERMISSION_DENIED');
 const entry=conversationDeck(w,meetingId).find(e=>e.key===topicKey);if(!entry)throw Error('VALIDATION');
 const {guide,item}=entry,keys=guide.fields.length?guide.fields:guide.group==='ביטוחים'?['ins']:guide.group==='פנסיה וחסכונות'?['savings','savings_goals']:[];
 const all=briefInput(w,meeting.family_id).sources;
 const sources:AiSource[]=all.filter(s=>s.kind==='reported'&&keys.some(k=>s.id==='q:'+k||s.id.startsWith('q:'+k+'.')||s.id.startsWith('q:'+k+'[')));
 sources.push({id:'guide:'+guide.key,label:'הנחיות לנציג · '+guide.title,value:[guide.explain,guide.say,...guide.needs].join('\n'),kind:'guide'});
 const docKeys=guide.key==='household_income'?['payslip','salary']:guide.serviceKeys;
 const docs=new Set(w.documents.filter(d=>d.family_id===meeting.family_id&&docKeys.some(k=>d.key.includes(k))).map(d=>d.id));
 sources.push(...documentFacts.filter(s=>s.document_id&&docs.has(s.document_id)));
 if(item){for(const key of ['current_situation','recommendation','client_summary'] as const)if(item[key])sources.push({id:'item:'+item.id+':'+key,label:'הממצא שבכרטיס · '+(item.title||guide.title),value:String(item[key]).slice(0,3000),kind:'work'});
  const saving=savingsEvidence(item);if(saving)sources.push({id:'item:'+item.id+':comparison',label:'חישוב ההשוואה שבכרטיס',value:JSON.stringify(saving),kind:'work'});
 }
 const decision=w.guidedDecisions.find(d=>d.meeting_id===meetingId&&d.topic_key===topicKey);
 if(decision)sources.push({id:'conversation:decision',label:'הבחירה השמורה בנושא',value:guidedChoices[decision.decision],kind:'conversation'});
 if(notes.trim())sources.push({id:'conversation:notes',label:'ההערות שהנציג הזין בנושא',value:notes,kind:'conversation'});
 return {scope:'topic_assistance',meetingId,topicKey,action,notes,meetingStatus:meeting.status,decisionRevision:decision?.revision||0,topic:{title:item?.title||guide.title,question:guide.question,explain:guide.explain,needs:guide.needs},sources};
}
