-- ============================================================================
-- אבחון כלכלי 360° — v9 Schema
-- 0001_schema.sql — טבלאות, מפתחות זרים, אילוצים ואינדקסים
-- מתורגם ממודל v8 (family360_v8.html) ללא שינוי לוגיקה עסקית.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- ENUM-ים
-- נשמרים כ-TEXT + CHECK ולא כ-ENUM טיפוסי, כדי ש-Admin יוכל להרחיב ערכים
-- בעתיד בלי ALTER TYPE נעול. הערכים זהים בדיוק לקבועים ב-v8.
create schema if not exists f360;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete cascade,
  role          text not null check (role in ('admin','representative','professional','client')),
  name          text not null,
  email         text,
  phone         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_profiles_auth_user on public.profiles(auth_user_id);
create index idx_profiles_role      on public.profiles(role) where active;

-- ---------------------------------------------------------- representatives
create table public.representatives (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles(id) on delete restrict,
  active      boolean not null default true,
  permissions jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_reps_active on public.representatives(active);

-- ------------------------------------------------------------- professionals
create table public.professionals (
  id                       uuid primary key default gen_random_uuid(),
  profile_id               uuid not null unique references public.profiles(id) on delete restrict,
  business_name            text,
  active                   boolean not null default true,
  analysis_enabled         boolean not null default true,
  execution_enabled        boolean not null default true,
  analysis_sla_hours       integer check (analysis_sla_hours is null or analysis_sla_hours > 0),
  execution_sla_hours      integer check (execution_sla_hours is null or execution_sla_hours > 0),
  analysis_sla_overrides   jsonb not null default '{}'::jsonb,
  execution_sla_overrides  jsonb not null default '{}'::jsonb,
  agreement_type           text,
  commercial_note          text,   -- פנימי: חסום ל-client ול-professional אחר ב-RLS
  internal_note            text,   -- פנימי
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_pros_active on public.professionals(active);

-- ------------------------------------------------------------------ services
create table public.services (
  id                     uuid primary key default gen_random_uuid(),
  key                    text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  name                   text not null,
  icon                   text,
  category               text,
  description            text,
  active                 boolean not null default true,
  sort_order             integer not null default 0,
  analysis_sla_hours     integer check (analysis_sla_hours is null or analysis_sla_hours > 0),
  execution_sla_hours    integer check (execution_sla_hours is null or execution_sla_hours > 0),
  trigger_conditions     jsonb not null default '[]'::jsonb,
  client_fields          jsonb not null default '[]'::jsonb,
  required_documents     jsonb not null default '[]'::jsonb,
  professional_fields    jsonb not null default '[]'::jsonb,
  analysis_result_fields jsonb not null default '[]'::jsonb,
  automation_settings    jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_services_active on public.services(active, sort_order);

-- ------------------------------------------------------- professional_services
-- טבלת הקשר. היא המקור לכשירות (getEligibleProfessionals ב-v8):
-- professional.active AND professional.<mode>_enabled AND ps.<mode>_enabled
create table public.professional_services (
  id                uuid primary key default gen_random_uuid(),
  professional_id   uuid not null references public.professionals(id) on delete cascade,
  service_id        uuid not null references public.services(id)      on delete cascade,
  analysis_enabled  boolean not null default true,
  execution_enabled boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (professional_id, service_id)
);
create index idx_ps_service on public.professional_services(service_id);
create index idx_ps_pro     on public.professional_services(professional_id);

-- ------------------------------------------------------------------ families
create table public.families (
  id                 uuid primary key default gen_random_uuid(),
  case_number        text not null unique,
  representative_id  uuid references public.representatives(id) on delete set null,
  client_profile_id  uuid references public.profiles(id)        on delete set null,
  status             text not null default 'new' check (status in
                       ('new','waiting_docs','waiting_analysis','in_analysis','ready_meeting',
                        'meeting_set','meeting_done','in_execution','completed','archived')),
  name               text not null,
  contact_name       text,
  phone              text,
  email              text,
  answers            jsonb not null default '{}'::jsonb,
  onboarding_pct     numeric(5,2) not null default 0 check (onboarding_pct between 0 and 100),
  meeting_held       boolean not null default false,
  internal_notes     text,
  joined_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_families_rep    on public.families(representative_id);
create index idx_families_client on public.families(client_profile_id);
create index idx_families_status on public.families(status);

-- ------------------------------------------------------------ family_services
create table public.family_services (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families(id) on delete cascade,
  service_id        uuid not null references public.services(id) on delete restrict,
  status            text not null default 'waiting_analysis' check (status in
                      ('not_relevant','waiting_analysis','assigned','in_progress','needs_info',
                       'analysis_received','approved_analysis','waiting_meeting',
                       'client_approved_execution','no_execution_needed','client_declined','client_thinking',
                       'sent_execution','execution_in_progress','waiting_client','execution_needs_info',
                       'execution_reported_complete','completed','not_completed')),
  professional_id   uuid references public.professionals(id) on delete set null,
  analysis_task_id  uuid,   -- FK נוסף אחרי יצירת analysis_tasks
  execution_task_id uuid,   -- FK נוסף אחרי יצירת execution_tasks
  result_tone       text check (result_tone is null or result_tone in ('red','orange','yellow','green')),
  internal_note     text,
  sent_at           timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- מונע כפילות ברמת ה-DB (הבאג שתוקן ב-v8, כעת בלתי אפשרי מבנית)
  unique (family_id, service_id)
);
create index idx_fs_family  on public.family_services(family_id);
create index idx_fs_pro     on public.family_services(professional_id);
create index idx_fs_status  on public.family_services(status);

-- ------------------------------------------------------------- document_types
create table public.document_types (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  type        text not null default 'file' check (type in ('file','signature')),
  description text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------- documents
create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families(id)       on delete cascade,
  document_type_id uuid references public.document_types(id)          on delete set null,
  service_id       uuid references public.services(id)                on delete set null,
  key              text not null,
  name             text not null,
  who              text,
  type             text not null default 'file' check (type in ('file','signature')),
  status           text not null default 'missing' check (status in
                     ('missing','pending','approved','rejected','signed')),
  storage_path     text,
  file_name        text,
  file_size        bigint,
  mime_type        text,
  reject_reason    text,
  uploaded_at      timestamptz,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (family_id, key)
);
create index idx_docs_family on public.documents(family_id);
create index idx_docs_status on public.documents(status);

-- ------------------------------------------------------------ analysis_tasks
create table public.analysis_tasks (
  id                 uuid primary key default gen_random_uuid(),
  task_number        text not null unique,
  family_id          uuid not null references public.families(id)         on delete cascade,
  family_service_id  uuid not null references public.family_services(id)  on delete cascade,
  service_id         uuid not null references public.services(id)         on delete restrict,
  professional_id    uuid not null references public.professionals(id)    on delete restrict,
  representative_id  uuid references public.representatives(id)           on delete set null,
  status             text not null default 'assigned' check (status in
                       ('assigned','in_progress','needs_info','submitted','approved','returned','reassigned')),
  due_at             timestamptz,
  assigned_at        timestamptz not null default now(),
  opened_at          timestamptz,
  started_at         timestamptz,
  completed_at       timestamptz,
  rep_note           text,
  current_situation  text,
  findings           jsonb not null default '[]'::jsonb,
  result_tone        text check (result_tone is null or result_tone in ('red','orange','yellow','green')),
  recommendation     text,
  financial          jsonb not null default '{}'::jsonb,
  actions            jsonb not null default '[]'::jsonb,
  client_summary     text,
  internal_note      text,           -- לנציג בלבד; חסום ללקוח ב-RLS view
  result_values      jsonb not null default '{}'::jsonb,  -- שדות דינמיים (v8)
  snapshot           jsonb not null default '[]'::jsonb,  -- Data-minimized, מוקפא
  attachments        jsonb not null default '[]'::jsonb,  -- metadata; הקובץ ב-Storage
  info_requests      jsonb not null default '[]'::jsonb,
  return_history     jsonb not null default '[]'::jsonb,
  prior_task_id      uuid references public.analysis_tasks(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_at_family on public.analysis_tasks(family_id);
create index idx_at_pro    on public.analysis_tasks(professional_id, status);
create index idx_at_fs     on public.analysis_tasks(family_service_id);
create index idx_at_due    on public.analysis_tasks(due_at) where status in ('assigned','in_progress','needs_info');
-- לכל תחום לכל היותר משימת ניתוח פעילה אחת
create unique index uq_at_active_per_service on public.analysis_tasks(family_service_id)
  where status in ('assigned','in_progress','needs_info');

-- ----------------------------------------------------------------- meetings
create table public.meetings (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references public.families(id)       on delete cascade,
  representative_id  uuid references public.representatives(id)         on delete set null,
  status             text not null default 'scheduled' check (status in
                       ('scheduled','in_progress','completed','cancelled')),
  type               text default 'inperson' check (type in ('inperson','phone','video','zoom')),
  duration_min       integer default 60,
  note               text,
  cancel_reason      text,
  scheduled_at       timestamptz,
  started_at         timestamptz,
  completed_at       timestamptz,
  current_item_index integer not null default -1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_meetings_family on public.meetings(family_id);
create index idx_meetings_status on public.meetings(status, scheduled_at);

-- ------------------------------------------------------------- meeting_items
-- Snapshot מוקפא של הניתוח בזמן הפגישה — לא reference חי (עיקרון v5).
create table public.meeting_items (
  id                     uuid primary key default gen_random_uuid(),
  meeting_id             uuid not null references public.meetings(id)         on delete cascade,
  family_id              uuid not null references public.families(id)         on delete cascade,
  family_service_id      uuid not null references public.family_services(id)  on delete cascade,
  service_id             uuid not null references public.services(id)         on delete restrict,
  analysis_task_id       uuid references public.analysis_tasks(id)            on delete set null,
  sort_order             integer not null default 0,
  visible_to_client      boolean not null default true,
  result_tone            text check (result_tone is null or result_tone in ('red','orange','yellow','green')),
  title                  text,
  icon                   text,
  client_summary         text,
  current_situation      text,
  recommendation         text,
  financial              jsonb not null default '{}'::jsonb,
  actions                jsonb not null default '[]'::jsonb,
  attachments            jsonb not null default '[]'::jsonb,
  professional_name      text,
  representative_note    text,     -- פנימי — לא visible_to_client
  client_decision        text check (client_decision is null or client_decision in
                           ('progress','thinking','declined','no_action','undecided')),
  decision_note          text,
  approved_actions       jsonb not null default '[]'::jsonb,
  execution_instructions text,
  contact_window         text,
  urgency                text default 'normal' check (urgency in ('normal','high')),
  follow_up_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (meeting_id, family_service_id)
);
create index idx_mi_meeting on public.meeting_items(meeting_id, sort_order);
create index idx_mi_family  on public.meeting_items(family_id);

-- ----------------------------------------------------------- execution_tasks
create table public.execution_tasks (
  id                      uuid primary key default gen_random_uuid(),
  task_number             text not null unique,
  family_id               uuid not null references public.families(id)        on delete cascade,
  family_service_id       uuid not null references public.family_services(id) on delete cascade,
  service_id              uuid not null references public.services(id)        on delete restrict,
  professional_id         uuid not null references public.professionals(id)   on delete restrict,
  representative_id       uuid references public.representatives(id)          on delete set null,
  -- שרשרת עקיבות: ניתוח → פריט פגישה → החלטת לקוח → ביצוע
  source_meeting_id       uuid references public.meetings(id)        on delete set null,
  source_meeting_item_id  uuid references public.meeting_items(id)   on delete set null,
  analysis_task_id        uuid references public.analysis_tasks(id)  on delete set null,
  prior_task_id           uuid references public.execution_tasks(id) on delete set null,
  status                  text not null default 'sent_execution' check (status in
                            ('sent_execution','execution_in_progress','waiting_client','needs_info',
                             'execution_reported_complete','completed','not_completed','cancelled','reassigned')),
  due_at                  timestamptz,
  sent_at                 timestamptz not null default now(),
  opened_at               timestamptz,
  started_at              timestamptz,
  reported_at             timestamptz,
  completed_at            timestamptz,
  client_name             text,
  client_phone            text,
  client_email            text,
  client_decision_at      timestamptz,
  instructions            text,
  approved_actions        jsonb not null default '[]'::jsonb,
  urgency                 text default 'normal' check (urgency in ('normal','high')),
  contact_window          text,
  snapshot                jsonb not null default '[]'::jsonb,
  representative_note     text,
  waiting_reason          text,
  waiting_follow_up_at    timestamptz,
  outcome                 text,
  outcome_summary         text,
  outcome_result          text,
  outcome_value           numeric(14,2),
  outcome_note            text,
  close_reason            text,
  cancel_reason           text,
  info_requests           jsonb not null default '[]'::jsonb,
  return_history          jsonb not null default '[]'::jsonb,
  reassignment_history    jsonb not null default '[]'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index idx_et_family on public.execution_tasks(family_id);
create index idx_et_pro    on public.execution_tasks(professional_id, status);
create index idx_et_fs     on public.execution_tasks(family_service_id);
create index idx_et_due    on public.execution_tasks(due_at)
  where status in ('sent_execution','execution_in_progress','waiting_client','needs_info','execution_reported_complete');
-- לכל תחום לכל היותר משימת ביצוע פעילה אחת (מונע את התקלה שנבדקה ב-v8)
create unique index uq_et_active_per_service on public.execution_tasks(family_service_id)
  where status in ('sent_execution','execution_in_progress','waiting_client','needs_info','execution_reported_complete');

-- FK-ים מעגליים — נוספים כעת
alter table public.family_services
  add constraint fk_fs_analysis_task  foreign key (analysis_task_id)  references public.analysis_tasks(id)  on delete set null,
  add constraint fk_fs_execution_task foreign key (execution_task_id) references public.execution_tasks(id) on delete set null;

-- --------------------------------------------------------- execution_updates
-- מנורמל (ולא JSONB): רשומות Append-Only שצומחות ללא גבול, נשלפות לפי סדר זמן,
-- ומשמשות בעתיד למדידת טיפול בלידים. ראה README לנימוק המלא.
create table public.execution_updates (
  id                uuid primary key default gen_random_uuid(),
  execution_task_id uuid not null references public.execution_tasks(id) on delete cascade,
  author_profile_id uuid references public.profiles(id) on delete set null,
  author_name       text,
  kind              text not null check (kind in
                      ('contact_attempt','client_call','documents','progress','note','other')),
  contact_result    text check (contact_result is null or contact_result in
                      ('answered','no_answer','called_back','call_scheduled','other')),
  text              text,
  created_at        timestamptz not null default now()
);
create index idx_eu_task on public.execution_updates(execution_task_id, created_at desc);

-- -------------------------------------------------------- execution_messages
create table public.execution_messages (
  id                uuid primary key default gen_random_uuid(),
  execution_task_id uuid not null references public.execution_tasks(id) on delete cascade,
  sender_profile_id uuid references public.profiles(id) on delete set null,
  sender_role       text,
  recipient_role    text,
  body              text not null,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);
create index idx_em_task on public.execution_messages(execution_task_id, created_at);

-- ------------------------------------------------------------- task_documents
-- שיוך מפורש של מסמכים למשימה. זהו המקור היחיד להרשאת Storage של בעל מקצוע:
-- בלי רשומה כאן — אין גישה לקובץ, גם אם הוא שייך לאותה משפחה.
create table public.task_documents (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references public.documents(id)        on delete cascade,
  analysis_task_id  uuid references public.analysis_tasks(id)            on delete cascade,
  execution_task_id uuid references public.execution_tasks(id)           on delete cascade,
  shared_at         timestamptz not null default now(),
  shared_by         uuid references public.profiles(id) on delete set null,
  revoked_at        timestamptz,
  constraint chk_task_doc_target check (
    (analysis_task_id is not null and execution_task_id is null) or
    (analysis_task_id is null and execution_task_id is not null))
);
create unique index uq_td_analysis  on public.task_documents(document_id, analysis_task_id)  where analysis_task_id  is not null;
create unique index uq_td_execution on public.task_documents(document_id, execution_task_id) where execution_task_id is not null;
create index idx_td_doc on public.task_documents(document_id);

-- ------------------------------------------------------------ timeline_events
create table public.timeline_events (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references public.families(id) on delete cascade,
  event_type       text not null default 'general',
  title            text not null,
  description      text,
  metadata         jsonb not null default '{}'::jsonb,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index idx_tl_family on public.timeline_events(family_id, created_at desc);

-- ------------------------------------------------------------- notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  family_id  uuid references public.families(id) on delete cascade,
  title      text not null,
  body       text,
  type       text not null default 'general',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index idx_notif_profile on public.notifications(profile_id, read_at, created_at desc);

-- ---------------------------------------------------------- message_templates
create table public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  subject    text not null,
  body       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- email_logs
create table public.email_logs (
  id                   uuid primary key default gen_random_uuid(),
  family_id            uuid references public.families(id) on delete set null,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  recipient_email      text,
  subject              text not null,
  body                 text,
  template_id          uuid references public.message_templates(id) on delete set null,
  event_key            text,
  status               text not null default 'simulated_sent'
                         check (status in ('simulated_sent','queued','sent','failed')),
  created_at           timestamptz not null default now()
);
create index idx_email_family on public.email_logs(family_id, created_at desc);

-- ---------------------------------------------------------------- automations
create table public.automations (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  name          text not null,
  event_key     text not null,
  active        boolean not null default true,
  delay_minutes integer not null default 0,   -- v8 שמר שעות; ההמרה נעשית ב-Seed
  channel       text not null default 'in_app' check (channel in ('in_app','email')),
  template_id   uuid references public.message_templates(id) on delete set null,
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_autom_event on public.automations(event_key) where active;

-- ------------------------------------------------------------ system_settings
-- key/value ולא Row יחיד: מאפשר הוספת הגדרה בלי ALTER TABLE, ומאפשר
-- הרשאה/Audit ברמת מפתח בודד בעתיד.
create table public.system_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- ------------------------------------------------------------------ audit_log
-- Append-Only. אין policy ל-UPDATE/DELETE לאף Role (ראה 0003_rls.sql).
create table public.audit_log (
  id               uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_role       text,
  action           text not null,
  entity_type      text not null,
  entity_id        uuid,
  entity_name      text,
  description      text,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
create index idx_audit_created on public.audit_log(created_at desc);
create index idx_audit_entity  on public.audit_log(entity_type, entity_id);

-- ------------------------------------------------------------------ counters
-- מספור רץ לתעודות משימה (AN-/EX-), אטומי דרך UPDATE ... RETURNING
create table public.counters (
  key     text primary key,
  value   bigint not null
);
insert into public.counters(key,value) values ('analysis_task',1291),('execution_task',470)
  on conflict (key) do nothing;
