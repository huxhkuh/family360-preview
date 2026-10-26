-- Generated from the complete local PostgreSQL migrations by generate-d1.mjs.

-- Auth identities are external; auth_user_id is unique but has no cross-service FK.

PRAGMA foreign_keys = ON;

CREATE TABLE "agent_invitations" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "token_hash" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "email" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "expires_at" TEXT NOT NULL,
  "revoked_at" TEXT,
  "accepted_at" TEXT,
  "accepted_by" TEXT,
  FOREIGN KEY (accepted_by) REFERENCES profiles(id),
  FOREIGN KEY (created_by) REFERENCES profiles(id),
  CHECK (((length(label) >= 2) AND (length(label) <= 150))),
  PRIMARY KEY (id),
  UNIQUE (token_hash)
);

CREATE TABLE "family_contacts" (
  "id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "occurred_at" TEXT NOT NULL,
  "created_by" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "next_task_id" TEXT,
  FOREIGN KEY (created_by) REFERENCES profiles(id),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CHECK ((kind IN ('phone', 'meeting', 'message', 'other'))),
  FOREIGN KEY (next_task_id) REFERENCES family_tasks(id) DEFERRABLE INITIALLY DEFERRED,
  PRIMARY KEY (id)
);

CREATE TABLE "family_tasks" (
  "id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '',
  "owner_role" TEXT NOT NULL,
  "due_on" TEXT NOT NULL,
  "visible_to_client" INTEGER NOT NULL DEFAULT 0 CHECK ("visible_to_client" IN (0,1)),
  "status" TEXT NOT NULL DEFAULT 'open',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (((owner_role <> 'client') OR visible_to_client)),
  FOREIGN KEY (created_by) REFERENCES profiles(id),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CHECK ((owner_role IN ('representative', 'client'))),
  PRIMARY KEY (id),
  CHECK ((status IN ('open', 'in_progress', 'completed', 'cancelled'))),
  FOREIGN KEY (updated_by) REFERENCES profiles(id)
);

CREATE TABLE "meeting_followups" (
  "id" TEXT NOT NULL,
  "meeting_id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "item_id" TEXT,
  "title" TEXT NOT NULL,
  "details" TEXT NOT NULL DEFAULT '',
  "owner_role" TEXT NOT NULL,
  "due_on" TEXT NOT NULL,
  "visible_to_client" INTEGER NOT NULL DEFAULT 0 CHECK ("visible_to_client" IN (0,1)),
  "status" TEXT NOT NULL DEFAULT 'open',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "completed_at" TEXT,
  CHECK (((owner_role <> 'client') OR visible_to_client)),
  FOREIGN KEY (created_by) REFERENCES profiles(id),
  CHECK ((length(details) <= 3000)),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES meeting_items(id) ON DELETE CASCADE,
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CHECK ((owner_role IN ('client', 'representative'))),
  PRIMARY KEY (id),
  CHECK ((status IN ('open', 'in_progress', 'completed', 'cancelled'))),
  CHECK (((length(trim(title)) >= 3) AND (length(trim(title)) <= 200))),
  FOREIGN KEY (updated_by) REFERENCES profiles(id)
);

CREATE TABLE "meeting_topic_catalog" (
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  PRIMARY KEY (key)
);

CREATE TABLE "meeting_topic_checks" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "meeting_id" TEXT NOT NULL,
  "topic_key" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "note" TEXT NOT NULL DEFAULT '',
  "followup_id" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updated_by" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (followup_id) REFERENCES meeting_followups(id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  UNIQUE (meeting_id, topic_key),
  CHECK ((length(note) <= 2000)),
  PRIMARY KEY (id),
  CHECK ((result IN ('pending', 'not_relevant', 'no_action', 'follow_up'))),
  FOREIGN KEY (topic_key) REFERENCES meeting_topic_catalog(key),
  FOREIGN KEY (updated_by) REFERENCES profiles(id)
);

CREATE TABLE "professional_offers" (
  "id" TEXT NOT NULL,
  "family_service_id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "candidates" TEXT NOT NULL CHECK (json_valid("candidates")),
  "note" TEXT NOT NULL DEFAULT '',
  "source_analysis_task_id" TEXT,
  "source_execution_task_id" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "expires_at" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "claimed_by" TEXT,
  "task_id" TEXT,
  FOREIGN KEY (claimed_by) REFERENCES professionals(id),
  FOREIGN KEY (created_by) REFERENCES profiles(id),
  FOREIGN KEY (family_service_id) REFERENCES family_services(id),
  CHECK ((kind IN ('analysis', 'execution'))),
  PRIMARY KEY (id),
  CHECK ((status IN ('open', 'claimed', 'cancelled')))
);

CREATE TABLE "reminder_receipts" (
  "task_id" TEXT NOT NULL,
  "profile_id" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  PRIMARY KEY (task_id, profile_id, day)
);

CREATE TABLE "resources" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "chapter" TEXT NOT NULL,
  "verified_at" TEXT,
  "verified_by" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (verified_by) REFERENCES profiles(id)
);

CREATE TABLE "analysis_tasks" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "task_number" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "family_service_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "representative_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'assigned',
  "due_at" TEXT,
  "assigned_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "opened_at" TEXT,
  "started_at" TEXT,
  "completed_at" TEXT,
  "rep_note" TEXT,
  "current_situation" TEXT,
  "findings" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("findings")),
  "result_tone" TEXT,
  "recommendation" TEXT,
  "financial" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("financial")),
  "actions" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("actions")),
  "client_summary" TEXT,
  "internal_note" TEXT,
  "result_values" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("result_values")),
  "snapshot" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("snapshot")),
  "attachments" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("attachments")),
  "info_requests" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("info_requests")),
  "return_history" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("return_history")),
  "prior_task_id" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (family_service_id) REFERENCES family_services(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (prior_task_id) REFERENCES analysis_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE RESTRICT,
  FOREIGN KEY (representative_id) REFERENCES representatives(id) ON DELETE SET NULL,
  CHECK (((result_tone IS NULL) OR (result_tone IN ('red', 'orange', 'yellow', 'green')))),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CHECK ((status IN ('assigned', 'in_progress', 'needs_info', 'submitted', 'approved', 'returned', 'reassigned'))),
  UNIQUE (task_number)
);

CREATE TABLE "audit_log" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "actor_profile_id" TEXT,
  "actor_role" TEXT,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT,
  "entity_name" TEXT,
  "description" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("metadata")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (id)
);

CREATE TABLE "automations" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "delay_minutes" INTEGER NOT NULL DEFAULT 0,
  "channel" TEXT NOT NULL DEFAULT 'in_app',
  "template_id" TEXT,
  "settings" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("settings")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((channel IN ('in_app', 'email'))),
  UNIQUE (key),
  PRIMARY KEY (id),
  FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
);

CREATE TABLE "counters" (
  "key" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  PRIMARY KEY (key)
);

CREATE TABLE "document_types" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'file',
  "description" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (key),
  PRIMARY KEY (id),
  CHECK ((type IN ('file', 'signature')))
);

CREATE TABLE "documents" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "family_id" TEXT NOT NULL,
  "document_type_id" TEXT,
  "service_id" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "who" TEXT,
  "type" TEXT NOT NULL DEFAULT 'file',
  "status" TEXT NOT NULL DEFAULT 'missing',
  "storage_path" TEXT,
  "file_name" TEXT,
  "file_size" INTEGER,
  "mime_type" TEXT,
  "reject_reason" TEXT,
  "uploaded_at" TEXT,
  "approved_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE SET NULL,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  UNIQUE (family_id, key),
  PRIMARY KEY (id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CHECK ((status IN ('missing', 'pending', 'approved', 'rejected', 'signed'))),
  CHECK ((type IN ('file', 'signature')))
);

CREATE TABLE "email_logs" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "family_id" TEXT,
  "recipient_profile_id" TEXT,
  "recipient_email" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT,
  "template_id" TEXT,
  "event_key" TEXT,
  "status" TEXT NOT NULL DEFAULT 'simulated_sent',
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (recipient_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CHECK ((status IN ('simulated_sent', 'queued', 'sent', 'failed'))),
  FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL
);

CREATE TABLE "execution_messages" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "execution_task_id" TEXT NOT NULL,
  "sender_profile_id" TEXT,
  "sender_role" TEXT,
  "recipient_role" TEXT,
  "body" TEXT NOT NULL,
  "read_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (execution_task_id) REFERENCES execution_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (sender_profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE "execution_tasks" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "task_number" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "family_service_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "professional_id" TEXT NOT NULL,
  "representative_id" TEXT,
  "source_meeting_id" TEXT,
  "source_meeting_item_id" TEXT,
  "analysis_task_id" TEXT,
  "prior_task_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'sent_execution',
  "due_at" TEXT,
  "sent_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "opened_at" TEXT,
  "started_at" TEXT,
  "reported_at" TEXT,
  "completed_at" TEXT,
  "client_name" TEXT,
  "client_phone" TEXT,
  "client_email" TEXT,
  "client_decision_at" TEXT,
  "instructions" TEXT,
  "approved_actions" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("approved_actions")),
  "urgency" TEXT DEFAULT 'normal',
  "contact_window" TEXT,
  "snapshot" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("snapshot")),
  "representative_note" TEXT,
  "waiting_reason" TEXT,
  "waiting_follow_up_at" TEXT,
  "outcome" TEXT,
  "outcome_summary" TEXT,
  "outcome_result" TEXT,
  "outcome_value" NUMERIC,
  "outcome_note" TEXT,
  "close_reason" TEXT,
  "cancel_reason" TEXT,
  "info_requests" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("info_requests")),
  "return_history" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("return_history")),
  "reassignment_history" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("reassignment_history")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (analysis_task_id) REFERENCES analysis_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (family_service_id) REFERENCES family_services(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (prior_task_id) REFERENCES execution_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE RESTRICT,
  FOREIGN KEY (representative_id) REFERENCES representatives(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_meeting_id) REFERENCES meetings(id) ON DELETE SET NULL,
  FOREIGN KEY (source_meeting_item_id) REFERENCES meeting_items(id) ON DELETE SET NULL,
  CHECK ((status IN ('sent_execution', 'execution_in_progress', 'waiting_client', 'needs_info', 'execution_reported_complete', 'completed', 'not_completed', 'cancelled', 'reassigned'))),
  UNIQUE (task_number),
  CHECK ((urgency IN ('normal', 'high')))
);

CREATE TABLE "execution_updates" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "execution_task_id" TEXT NOT NULL,
  "author_profile_id" TEXT,
  "author_name" TEXT,
  "kind" TEXT NOT NULL,
  "contact_result" TEXT,
  "text" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (author_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CHECK (((contact_result IS NULL) OR (contact_result IN ('answered', 'no_answer', 'called_back', 'call_scheduled', 'other')))),
  FOREIGN KEY (execution_task_id) REFERENCES execution_tasks(id) ON DELETE CASCADE,
  CHECK ((kind IN ('contact_attempt', 'client_call', 'documents', 'progress', 'note', 'other'))),
  PRIMARY KEY (id)
);

CREATE TABLE "families" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "case_number" TEXT NOT NULL,
  "representative_id" TEXT,
  "client_profile_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "name" TEXT NOT NULL,
  "contact_name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "answers" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("answers")),
  "onboarding_pct" NUMERIC NOT NULL DEFAULT 0,
  "meeting_held" INTEGER NOT NULL DEFAULT 0 CHECK ("meeting_held" IN (0,1)),
  "internal_notes" TEXT,
  "joined_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (case_number),
  FOREIGN KEY (client_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CHECK (((onboarding_pct >= (0)) AND (onboarding_pct <= (100)))),
  PRIMARY KEY (id),
  FOREIGN KEY (representative_id) REFERENCES representatives(id) ON DELETE SET NULL,
  CHECK ((status IN ('new', 'waiting_docs', 'waiting_analysis', 'in_analysis', 'ready_meeting', 'meeting_set', 'meeting_done', 'in_execution', 'completed', 'archived')))
);

CREATE TABLE "family_services" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "family_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'waiting_analysis',
  "professional_id" TEXT,
  "analysis_task_id" TEXT,
  "execution_task_id" TEXT,
  "result_tone" TEXT,
  "internal_note" TEXT,
  "sent_at" TEXT,
  "completed_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  UNIQUE (family_id, service_id),
  PRIMARY KEY (id),
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL,
  CHECK (((result_tone IS NULL) OR (result_tone IN ('red', 'orange', 'yellow', 'green')))),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CHECK ((status IN ('not_relevant', 'waiting_analysis', 'assigned', 'in_progress', 'needs_info', 'analysis_received', 'approved_analysis', 'waiting_meeting', 'client_approved_execution', 'no_execution_needed', 'client_declined', 'client_thinking', 'sent_execution', 'execution_in_progress', 'waiting_client', 'execution_needs_info', 'execution_reported_complete', 'completed', 'not_completed'))),
  FOREIGN KEY (analysis_task_id) REFERENCES analysis_tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (execution_task_id) REFERENCES execution_tasks(id) ON DELETE SET NULL
);

CREATE TABLE "meeting_items" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "meeting_id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "family_service_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "analysis_task_id" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "visible_to_client" INTEGER NOT NULL DEFAULT 1 CHECK ("visible_to_client" IN (0,1)),
  "result_tone" TEXT,
  "title" TEXT,
  "icon" TEXT,
  "client_summary" TEXT,
  "current_situation" TEXT,
  "recommendation" TEXT,
  "financial" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("financial")),
  "actions" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("actions")),
  "attachments" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("attachments")),
  "professional_name" TEXT,
  "representative_note" TEXT,
  "client_decision" TEXT,
  "decision_note" TEXT,
  "approved_actions" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("approved_actions")),
  "execution_instructions" TEXT,
  "contact_window" TEXT,
  "urgency" TEXT DEFAULT 'normal',
  "follow_up_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (analysis_task_id) REFERENCES analysis_tasks(id) ON DELETE SET NULL,
  CHECK (((client_decision IS NULL) OR (client_decision IN ('progress', 'thinking', 'declined', 'no_action', 'undecided')))),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (family_service_id) REFERENCES family_services(id) ON DELETE CASCADE,
  UNIQUE (meeting_id, family_service_id),
  FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  CHECK (((result_tone IS NULL) OR (result_tone IN ('red', 'orange', 'yellow', 'green')))),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CHECK ((urgency IN ('normal', 'high')))
);

CREATE TABLE "meetings" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "family_id" TEXT NOT NULL,
  "representative_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "type" TEXT DEFAULT 'inperson',
  "duration_min" INTEGER DEFAULT 60,
  "note" TEXT,
  "cancel_reason" TEXT,
  "scheduled_at" TEXT,
  "started_at" TEXT,
  "completed_at" TEXT,
  "current_item_index" INTEGER NOT NULL DEFAULT '-1',
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (representative_id) REFERENCES representatives(id) ON DELETE SET NULL,
  CHECK ((status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))),
  CHECK ((type IN ('inperson', 'phone', 'video', 'zoom')))
);

CREATE TABLE "message_templates" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (key),
  PRIMARY KEY (id)
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "profile_id" TEXT NOT NULL,
  "family_id" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "type" TEXT NOT NULL DEFAULT 'general',
  "read_at" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE "professional_services" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "professional_id" TEXT NOT NULL,
  "service_id" TEXT NOT NULL,
  "analysis_enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("analysis_enabled" IN (0,1)),
  "execution_enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("execution_enabled" IN (0,1)),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE,
  UNIQUE (professional_id, service_id),
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE TABLE "professionals" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "profile_id" TEXT NOT NULL,
  "business_name" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "analysis_enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("analysis_enabled" IN (0,1)),
  "execution_enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("execution_enabled" IN (0,1)),
  "analysis_sla_hours" INTEGER,
  "execution_sla_hours" INTEGER,
  "analysis_sla_overrides" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("analysis_sla_overrides")),
  "execution_sla_overrides" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("execution_sla_overrides")),
  "agreement_type" TEXT,
  "commercial_note" TEXT,
  "internal_note" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (((analysis_sla_hours IS NULL) OR (analysis_sla_hours > 0))),
  CHECK (((execution_sla_hours IS NULL) OR (execution_sla_hours > 0))),
  PRIMARY KEY (id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  UNIQUE (profile_id)
);

CREATE TABLE "profiles" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "auth_user_id" TEXT,
  "role" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "agent_invitation_id" TEXT,
  "invited_by" TEXT,
  "joined_as_agent_at" TEXT,
  FOREIGN KEY (agent_invitation_id) REFERENCES agent_invitations(id),
  UNIQUE (auth_user_id),
  FOREIGN KEY (invited_by) REFERENCES profiles(id),
  PRIMARY KEY (id),
  CHECK ((role IN ('admin', 'representative', 'professional', 'client', 'marketer')))
);

CREATE TABLE "representatives" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "profile_id" TEXT NOT NULL,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "permissions" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("permissions")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (id),
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  UNIQUE (profile_id)
);

CREATE TABLE "services" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT,
  "category" TEXT,
  "description" TEXT,
  "active" INTEGER NOT NULL DEFAULT 1 CHECK ("active" IN (0,1)),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "analysis_sla_hours" INTEGER,
  "execution_sla_hours" INTEGER,
  "trigger_conditions" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("trigger_conditions")),
  "client_fields" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("client_fields")),
  "required_documents" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("required_documents")),
  "professional_fields" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("professional_fields")),
  "analysis_result_fields" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("analysis_result_fields")),
  "automation_settings" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("automation_settings")),
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (((analysis_sla_hours IS NULL) OR (analysis_sla_hours > 0))),
  CHECK (((execution_sla_hours IS NULL) OR (execution_sla_hours > 0))),
  CHECK ((length(key)>0 AND substr(key,1,1) GLOB '[a-z]' AND key NOT GLOB '*[^a-z0-9_]*')),
  UNIQUE (key),
  PRIMARY KEY (id)
);

CREATE TABLE "system_settings" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL CHECK (json_valid("value")),
  "updated_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "updated_by" TEXT,
  PRIMARY KEY (key),
  FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE "task_documents" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "document_id" TEXT NOT NULL,
  "analysis_task_id" TEXT,
  "execution_task_id" TEXT,
  "shared_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "shared_by" TEXT,
  "revoked_at" TEXT,
  CHECK ((((analysis_task_id IS NOT NULL) AND (execution_task_id IS NULL)) OR ((analysis_task_id IS NULL) AND (execution_task_id IS NOT NULL)))),
  FOREIGN KEY (analysis_task_id) REFERENCES analysis_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (execution_task_id) REFERENCES execution_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (shared_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE "timeline_events" (
  "id" TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  "family_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL DEFAULT 'general',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metadata" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("metadata")),
  "actor_profile_id" TEXT,
  "created_at" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (actor_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  PRIMARY KEY (id)
);

CREATE INDEX idx_profiles_auth_user ON profiles (auth_user_id);

CREATE INDEX idx_profiles_role ON profiles (role) WHERE active;

CREATE INDEX idx_reps_active ON representatives (active);

CREATE INDEX idx_pros_active ON professionals (active);

CREATE INDEX idx_services_active ON services (active, sort_order);

CREATE INDEX idx_ps_service ON professional_services (service_id);

CREATE INDEX idx_ps_pro ON professional_services (professional_id);

CREATE INDEX idx_families_rep ON families (representative_id);

CREATE INDEX idx_families_client ON families (client_profile_id);

CREATE INDEX idx_families_status ON families (status);

CREATE INDEX idx_fs_family ON family_services (family_id);

CREATE INDEX idx_fs_pro ON family_services (professional_id);

CREATE INDEX idx_fs_status ON family_services (status);

CREATE INDEX idx_docs_family ON documents (family_id);

CREATE INDEX idx_docs_status ON documents (status);

CREATE INDEX idx_at_family ON analysis_tasks (family_id);

CREATE INDEX idx_at_pro ON analysis_tasks (professional_id, status);

CREATE INDEX idx_at_fs ON analysis_tasks (family_service_id);

CREATE INDEX idx_at_due ON analysis_tasks (due_at) WHERE (status IN ('assigned', 'in_progress', 'needs_info'));

CREATE UNIQUE INDEX uq_td_analysis ON task_documents (document_id, analysis_task_id) WHERE (analysis_task_id IS NOT NULL);

CREATE UNIQUE INDEX uq_at_active_per_service ON analysis_tasks (family_service_id) WHERE (status IN ('assigned', 'in_progress', 'needs_info'));

CREATE INDEX idx_meetings_family ON meetings (family_id);

CREATE INDEX idx_meetings_status ON meetings (status, scheduled_at);

CREATE INDEX idx_mi_meeting ON meeting_items (meeting_id, sort_order);

CREATE INDEX idx_mi_family ON meeting_items (family_id);

CREATE INDEX idx_et_family ON execution_tasks (family_id);

CREATE INDEX idx_et_pro ON execution_tasks (professional_id, status);

CREATE INDEX idx_et_fs ON execution_tasks (family_service_id);

CREATE INDEX idx_et_due ON execution_tasks (due_at) WHERE (status IN ('sent_execution', 'execution_in_progress', 'waiting_client', 'needs_info', 'execution_reported_complete'));

CREATE UNIQUE INDEX uq_et_active_per_service ON execution_tasks (family_service_id) WHERE (status IN ('sent_execution', 'execution_in_progress', 'waiting_client', 'needs_info', 'execution_reported_complete'));

CREATE INDEX idx_eu_task ON execution_updates (execution_task_id, created_at DESC);

CREATE INDEX idx_em_task ON execution_messages (execution_task_id, created_at);

CREATE UNIQUE INDEX uq_td_execution ON task_documents (document_id, execution_task_id) WHERE (execution_task_id IS NOT NULL);

CREATE INDEX idx_td_doc ON task_documents (document_id);

CREATE INDEX idx_tl_family ON timeline_events (family_id, created_at DESC);

CREATE INDEX idx_notif_profile ON notifications (profile_id, read_at, created_at DESC);

CREATE INDEX idx_email_family ON email_logs (family_id, created_at DESC);

CREATE INDEX idx_autom_event ON automations (event_key) WHERE active;

CREATE INDEX idx_audit_created ON audit_log (created_at DESC);

CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);

CREATE INDEX meeting_followups_due ON meeting_followups (family_id, status, due_on);

CREATE INDEX meeting_followups_meeting ON meeting_followups (meeting_id);

CREATE INDEX family_tasks_family_id_status_due_on_idx ON family_tasks (family_id, status, due_on);

CREATE INDEX family_contacts_family_id_occurred_at_idx ON family_contacts (family_id, occurred_at DESC);

CREATE INDEX families_directory_order ON families (created_at DESC, id DESC);

CREATE UNIQUE INDEX professional_offers_family_service_id_idx ON professional_offers (family_service_id) WHERE (status = 'open');

INSERT INTO counters(key,value) VALUES ('analysis_task',0),('execution_task',0);
