import {z} from 'zod';
import type {AiJob,AiSource} from './contracts';

export const topicActions={simplify:'הסבר פשוט',followup:'שאלת המשך',missing:'מה חסר להמשך?',summarize:'סיכום ההערות'} as const;
export const topicActionSchema=z.enum(['simplify','followup','missing','summarize']);
export type TopicAction=z.infer<typeof topicActionSchema>;
export type TopicInput={scope:'topic_assistance';meetingId:string;topicKey:string;action:TopicAction;notes:string;meetingStatus:string;decisionRevision:number;topic:{title:string;question:string;explain:string;needs:string[]};sources:AiSource[]};
export const topicSuggestionSchema=z.object({text:z.string().trim().min(1).max(1800),sources:z.array(z.string().min(1).max(240)).min(1).max(12),caution:z.string().max(400)});
export type TopicSuggestion=z.infer<typeof topicSuggestionSchema>;
export type TopicJob=Omit<AiJob,'input'|'result'> & {purpose:'topic_assistance';input:TopicInput;result:TopicSuggestion|null};
export type TopicState={configured:boolean;job:TopicJob|null};
export function checkedTopicSuggestion(value:unknown,input:TopicInput):TopicSuggestion{
 const result=topicSuggestionSchema.parse(value),allowed=new Set(input.sources.map(s=>s.id));
 if(result.sources.some(id=>!allowed.has(id))||(input.action==='summarize'&&!result.sources.includes('conversation:notes')))throw Error('AI_OUTPUT_INVALID');
 return {...result,sources:[...new Set(result.sources)]};
}
export function appendTopicSummary(notes:string,text:string,heading='סיכום לנושא'){const result=notes+(notes.trim()?'\n\n':'')+heading+':\n'+text.trim();if(result.length>5000)throw Error('NOTE_LIMIT');return result;}
