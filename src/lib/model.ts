import {z} from 'zod';
export type Role='admin'|'representative'|'professional'|'client';
const base=z.object({id:z.string()});
export const profileSchema=base.extend({name:z.string(),role:z.enum(['admin','representative','professional','client']),active:z.boolean(),email:z.string().nullable().optional(),invited_by:z.string().nullable().optional(),agent_invitation_id:z.string().nullable().optional(),joined_as_agent_at:z.string().nullable().optional()});
const fieldSchema=z.object({key:z.string(),label:z.string(),type:z.string().default('text'),required:z.boolean().optional(),options:z.array(z.string()).optional(),show_when:z.object({field:z.string(),op:z.string(),value:z.unknown().optional()}).nullable().optional()});
const serviceSchema=base.extend({key:z.string(),name:z.string(),active:z.boolean(),icon:z.string().nullable().optional(),analysis_sla_hours:z.number().nullable().optional(),execution_sla_hours:z.number().nullable().optional(),trigger_conditions:z.array(z.object({field:z.string(),op:z.string(),value:z.unknown().optional()})),client_fields:z.array(fieldSchema),professional_fields:z.array(z.object({key:z.string(),label:z.string()})),required_documents:z.array(z.object({doc_key:z.string()}))});
const familySchema=base.extend({questionnaire_reviews:z.record(z.string(),z.object({token:z.string(),note:z.string()})).optional(),name:z.string(),case_number:z.string(),status:z.string(),phone:z.string().nullable().optional(),email:z.string().nullable().optional(),contact_name:z.string().nullable().optional(),answers:z.record(z.string(),z.unknown()).optional(),internal_notes:z.string().nullable().optional(),onboarding_pct:z.coerce.number().optional(),representative_id:z.string().nullable().optional(),updated_at:z.string().optional()});
const taskSchema=base.extend({family_id:z.string(),family_service_id:z.string(),service_id:z.string(),professional_id:z.string(),task_number:z.string(),status:z.string(),due_at:z.string().nullable().optional(),financial:z.record(z.string(),z.unknown()).optional(),current_situation:z.string().nullable().optional(),recommendation:z.string().nullable().optional(),client_summary:z.string().nullable().optional(),result_tone:z.string().nullable().optional(),internal_note:z.string().nullable().optional(),findings:z.array(z.unknown()).optional(),actions:z.array(z.unknown()).optional(),attachments:z.array(z.unknown()).optional(),result_values:z.record(z.string(),z.unknown()).optional(),snapshot:z.array(z.unknown()).optional(),outcome_summary:z.string().nullable().optional(),instructions:z.string().nullable().optional(),client_name:z.string().nullable().optional(),client_phone:z.string().nullable().optional()});
const docSchema=base.extend({consent:z.object({version:z.string(),recipient:z.string(),scope:z.string(),text:z.string(),signer:z.string(),signed_at:z.string()}).optional(),optional:z.boolean().optional(),purpose:z.string().optional(),subject:z.string().optional(),period:z.string().optional(),source_hint:z.string().optional(),family_id:z.string(),document_type_id:z.string().nullable().optional(),name:z.string(),key:z.string(),status:z.string(),type:z.string(),storage_path:z.string().nullable().optional(),file_name:z.string().nullable().optional(),reject_reason:z.string().nullable().optional()});
const followUpSchema=base.extend({document_id:z.string().nullable().optional(),meeting_id:z.string(),family_id:z.string(),item_id:z.string().nullable(),title:z.string(),details:z.string(),owner_role:z.enum(['client','representative']),owner_name:z.string(),due_on:z.string(),visible_to_client:z.boolean(),status:z.enum(['open','in_progress','completed','cancelled']),revision:z.number(),updated_at:z.string()});
export const workspaceSchema=z.object({
 professionalPoolEnabled:z.boolean().default(false),
 resourceLibraryEnabled:z.boolean().default(false),
 familyDirectoryEnabled:z.boolean().default(false),activityFeedEnabled:z.boolean().default(false),familiesTruncated:z.boolean().default(false),scopedFamilyId:z.string().nullable().default(null),
 familyWorkEnabled:z.boolean().default(false),familyWorkTruncated:z.boolean().default(false),
 familyTasks:z.array(base.extend({document_id:z.string().nullable().optional(),request_kind:z.enum(['help','correction']).optional(),source_id:z.string().optional(),source_kind:z.enum(['familyTask','followUp']).optional(),family_id:z.string(),title:z.string(),details:z.string(),owner_role:z.enum(['client','representative']),owner_name:z.string(),due_on:z.string(),visible_to_client:z.boolean(),status:z.enum(['open','in_progress','completed','cancelled']),revision:z.number(),updated_at:z.string()})).default([]),
 familyContacts:z.array(base.extend({family_id:z.string(),kind:z.enum(['phone','meeting','message','other']),summary:z.string(),occurred_at:z.string(),author_name:z.string(),next_task_id:z.string().nullable()})).default([]),
 workflowV2Enabled:z.boolean().default(false),questionnaireV2Enabled:z.boolean().default(false),
 topicChecksEnabled:z.boolean().default(false),topicChecks:z.array(base.extend({meeting_id:z.string(),topic_key:z.string(),result:z.enum(['pending','not_relevant','no_action','follow_up']),note:z.string(),followup_id:z.string().nullable(),revision:z.number(),updated_at:z.string()})).default([]),
 profile:profileSchema,permissions:z.array(z.string()),families:z.array(familySchema),services:z.array(serviceSchema),
 followUps:z.array(followUpSchema).default([]),followUpsEnabled:z.boolean().default(false),followUpsTruncated:z.boolean().default(false),
 familyServices:z.array(base.extend({family_id:z.string(),service_id:z.string(),status:z.string(),analysis_task_id:z.string().nullable(),execution_task_id:z.string().nullable()})),
 documents:z.array(docSchema),analysisTasks:z.array(taskSchema),executionTasks:z.array(taskSchema),
 meetings:z.array(base.extend({family_id:z.string(),status:z.string(),scheduled_at:z.string().nullable(),type:z.string().nullable()})),
 meetingItems:z.array(base.extend({meeting_id:z.string(),family_id:z.string(),title:z.string().nullable(),client_summary:z.string().nullable(),client_decision:z.string().nullable(),visible_to_client:z.boolean(),sort_order:z.number().optional(),financial:z.record(z.string(),z.unknown()).optional(),current_situation:z.string().nullable().optional(),recommendation:z.string().nullable().optional(),decision_note:z.string().nullable().optional(),execution_instructions:z.string().nullable().optional(),approved_actions:z.array(z.unknown()).optional(),updated_at:z.string().optional()})),
 professionals:z.array(base.extend({profile_id:z.string(),name:z.string(),active:z.boolean(),profile_active:z.boolean(),analysis_enabled:z.boolean(),execution_enabled:z.boolean(),business_name:z.string().nullable()})),
 professionalServices:z.array(base.extend({professional_id:z.string(),service_id:z.string(),analysis_enabled:z.boolean(),execution_enabled:z.boolean()})),
 representatives:z.array(base.extend({profile_id:z.string(),name:z.string(),active:z.boolean(),permissions:z.array(z.string())})),
 profiles:z.array(profileSchema),notifications:z.array(base.extend({title:z.string(),body:z.string().nullable(),read_at:z.string().nullable(),family_id:z.string().optional(),target_kind:z.enum(['document','familyTask']).optional(),target_id:z.string().optional(),audience:z.enum(['client','representative']).optional()})),
 timeline:z.array(base.extend({title:z.string(),created_at:z.string(),family_id:z.string()})),
 audit:z.array(base.extend({action:z.string(),entity_type:z.string(),description:z.string().nullable(),created_at:z.string()})),
 settings:z.record(z.string(),z.unknown()),automations:z.array(base.extend({key:z.string(),name:z.string(),active:z.boolean(),channel:z.string()})),
 templates:z.array(base.extend({key:z.string(),name:z.string(),subject:z.string(),body:z.string(),active:z.boolean()})),
 documentTypes:z.array(base.extend({key:z.string(),name:z.string(),type:z.string(),active:z.boolean(),description:z.string().nullable().optional()})),limit:z.number(),
});
export type Workspace=z.infer<typeof workspaceSchema>;
export type Profile=z.infer<typeof profileSchema>;
export type Family=z.infer<typeof familySchema>;
export type Service=z.infer<typeof serviceSchema>;
export type Field=z.infer<typeof fieldSchema>;
export type Task=z.infer<typeof taskSchema>;
export type Document=z.infer<typeof docSchema>;

export type Meeting=Workspace['meetings'][number];
export type MeetingItem=Workspace['meetingItems'][number];
export type FollowUp=z.infer<typeof followUpSchema>;
export type FamilyTask=Workspace['familyTasks'][number];
