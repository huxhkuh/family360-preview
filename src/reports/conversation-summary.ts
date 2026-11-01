import {z} from 'zod';
import type {Workspace} from '../lib/model';
import {conversationDeck,type GuidedChoice} from '../meetings/conversation-guide';

export const summaryTemplate={version:'conversation-v1',title:'סיכום השיחה',intro:'ריכזנו עבורכם את הנושאים שעלו בשיחה, את ההחלטות ואת הצעדים להמשך.',topics:'הנושאים שסיכמנו',next:'הצעדים הבאים',closing:'אנחנו כאן להמשך הליווי.',brand:'מסודרים 360'} as const;
export const familyDecisionLabels:Record<GuidedChoice,string>={progress:'סיכמנו להתקדם בטיפול',thinking:'להמשך בירור והחלטה',declined:'בחרתם שלא להתקדם',no_action:'אין צורך בטיפול בשלב זה',not_relevant:'אינו רלוונטי בשלב זה'};
const topicSourceSchema=z.object({key:z.string(),title:z.string(),decision:z.enum(['progress','thinking','declined','no_action','not_relevant']),note:z.string(),revision:z.number()});
export const summarySourceSchema=z.object({meeting_id:z.string(),family_id:z.string(),family_name:z.string(),case_number:z.string(),representative_name:z.string(),topics:z.array(topicSourceSchema),next:z.array(z.object({id:z.string(),title:z.string(),owner:z.string(),due_on:z.string()}))});
export type SummarySource=z.infer<typeof summarySourceSchema>;
export const summaryContentSchema=z.object({intro:z.string().trim().max(1000),closing:z.string().trim().max(1000),topics:z.array(z.object({key:z.string().max(180),included:z.boolean(),text:z.string().trim().max(3000),reviewed:z.boolean()})).max(150)}).refine(v=>v.topics.reduce((n,t)=>n+t.text.length,0)<=50000);
export type SummaryContent=z.infer<typeof summaryContentSchema>;
export const summarySnapshotSchema=z.object({template:z.literal('conversation-v1'),meeting_id:z.string(),family_id:z.string(),family_name:z.string(),case_number:z.string(),representative_name:z.string(),created_at:z.string(),approved_at:z.string(),approved_by:z.string(),revision:z.number().int().positive(),intro:z.string(),closing:z.string(),topics:z.array(z.object({key:z.string(),title:z.string(),decision:z.string(),text:z.string()})),next:summarySourceSchema.shape.next});
export type SummarySnapshot=z.infer<typeof summarySnapshotSchema>;
export type SummaryRecord={id:string;meeting_id:string;family_id:string;revision:number;status:'draft'|'shared';source:SummarySource;content:SummaryContent;snapshot:SummarySnapshot|null;created_at:string;updated_at:string};

export function conversationSummarySource(w:Workspace,meetingId:string):SummarySource{
 const meeting=w.meetings.find(m=>m.id===meetingId),family=w.families.find(f=>f.id===meeting?.family_id);if(!meeting||!family)throw Error('PERMISSION_DENIED');
 const deck=conversationDeck(w,meetingId),guided=w.guidedDecisions.filter(d=>d.meeting_id===meetingId);
 const topics=deck.flatMap(e=>{const row=guided.find(d=>d.topic_key===e.key);if(row)return [{key:e.key,title:e.item?.title||e.guide.title,decision:row.decision,note:row.note,revision:row.revision}];const decision=e.item?.client_decision;if(decision&&decision!=='undecided')return [{key:e.key,title:e.item!.title||e.guide.title,decision:decision as GuidedChoice,note:e.item?.decision_note||'',revision:0}];return [];});
 const followIds=new Set(guided.filter(d=>d.task_kind==='followup').map(d=>d.task_id));
 const tasks=[...w.followUps.filter(t=>t.meeting_id===meetingId),...w.familyTasks.filter(t=>followIds.has(t.id))].filter(t=>t.visible_to_client&&t.family_id===family.id&&!['cancelled','completed'].includes(t.status));
 const next=[...new Map(tasks.map(t=>[t.id,{id:t.id,title:t.title,owner:t.owner_role==='client'?'המשפחה':t.owner_name||'הנציג המטפל',due_on:t.due_on}])).values()];
 return {meeting_id:meeting.id,family_id:family.id,family_name:family.name,case_number:family.case_number,representative_name:w.representatives.find(r=>r.id===family.representative_id)?.name||'צוות מסודרים 360',topics,next};
}
export function newSummaryContent(source:SummarySource,old?:SummaryRecord):SummaryContent{
 const changedIdentity=!!old&&(source.family_name!==old.source.family_name||source.case_number!==old.source.case_number);
 return {intro:old?.content.intro??summaryTemplate.intro,closing:old?.content.closing??summaryTemplate.closing,topics:source.topics.map(s=>{const previous=old?.content.topics.find(t=>t.key===s.key),priorSource=old?.source.topics.find(t=>t.key===s.key);return {key:s.key,included:previous?.included??(!!s.note.trim()||['progress','thinking'].includes(s.decision)),text:previous?.text??(s.note.length<=3000?s.note:''),reviewed:!!previous?.reviewed&&!changedIdentity&&JSON.stringify(priorSource)===JSON.stringify(s)};})};
}
export function validateSummaryContent(content:SummaryContent,source:SummarySource,sharing=false){
 const parsed=summaryContentSchema.parse(content),keys=new Set(source.topics.map(t=>t.key));
 if(parsed.topics.length!==keys.size||new Set(parsed.topics.map(t=>t.key)).size!==keys.size||parsed.topics.some(t=>!keys.has(t.key)))throw Error('VALIDATION');
 if(sharing&&(!parsed.topics.some(t=>t.included)||parsed.topics.some(t=>t.included&&(!t.reviewed||source.topics.find(s=>s.key===t.key)!.note.trim()&&t.text.trim().length<3))))throw Error('SUMMARY_REVIEW_REQUIRED');
 return parsed;
}
export function summarySnapshot(record:SummaryRecord,approvedBy:string,at:string,revision=record.revision):SummarySnapshot{
 const s=record.source,c=record.content;return {template:summaryTemplate.version,meeting_id:s.meeting_id,family_id:s.family_id,family_name:s.family_name,case_number:s.case_number,representative_name:s.representative_name,created_at:record.created_at,approved_at:at,approved_by:approvedBy,revision,intro:c.intro,closing:c.closing,topics:c.topics.filter(t=>t.included).map(t=>{const source=s.topics.find(s=>s.key===t.key)!;return {key:t.key,title:source.title,decision:familyDecisionLabels[source.decision],text:t.text};}),next:s.next};
}
