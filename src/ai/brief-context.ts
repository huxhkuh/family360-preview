import type {Workspace} from '../lib/model';
import {meetingBrief} from '../representative/meeting-brief';
import {conversationGuides} from '../meetings/conversation-guide';
import {buildQuestionnaireCoverage} from '../reports/questionnaire-coverage';
import type {AiSource,BriefInput} from './contracts';

export function briefInput(w:Workspace,familyId:string,documentFacts:AiSource[]=[]):BriefInput{
 const data=meetingBrief(w,familyId);if(!data)throw Error('PERMISSION_DENIED');
 const sources:AiSource[]=data.answered.filter(a=>!/(?:^|[._])(?:id|email|phone|first|last|name|address|street)$/.test(a.key)).map(a=>({id:'q:'+a.key,label:a.label,value:a.value,kind:'reported'}));
 sources.push(...documentFacts);
 for(const task of w.analysisTasks.filter(t=>t.family_id===familyId&&['approved','approved_analysis'].includes(t.status)))for(const key of ['current_situation','recommendation','client_summary'] as const){const value=task[key];if(typeof value==='string'&&value.trim())sources.push({id:`a:${task.id}:${key}`,label:w.services.find(s=>s.id===task.service_id)?.name||'ממצא מקצועי',value:value.slice(0,3000),kind:'professional'});}
 for(const task of data.openTasks)sources.push({id:'task:'+task.id,label:'פעולה פתוחה',value:task.title,kind:'work'});
 if(!sources.length)sources.push({id:'case:missing',label:'מצב המידע',value:'טרם נמסר מידע מספיק להכנה. יש לברר עם המשפחה.',kind:'work'});
 const ids=new Set(sources.map(s=>s.id));
 return {sources,topics:conversationGuides.map(g=>({key:g.key,title:g.title,question:g.question,explain:g.explain,needs:g.needs})),coverage:buildQuestionnaireCoverage(data.family.answers||{},[],w.services).map(c=>({key:c.key,title:c.title,shown:c.shown,source_ids:c.items.map(i=>'q:'+i.key).filter(id=>ids.has(id))}))};
}
