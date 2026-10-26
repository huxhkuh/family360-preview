begin;
-- Screening is separate from approved professional recommendations and execution.
create table f360.meeting_topic_catalog(key text primary key,title text not null);
insert into f360.meeting_topic_catalog(key,title) values
 ('mortgage_life','ביטוח חיים למשכנתא'),('building','ביטוח מבנה'),('car','ביטוח רכב'),
 ('arevim','ערבים'),('lemichyatem','למחייתם'),('nursing','ביטוח סיעודי'),
 ('health_supplement','ביטוח משלים בקופת חולים'),('health','ביטוח בריאות'),
 ('study_husband','קרן השתלמות — בעל'),('study_wife','קרן השתלמות — אישה'),
 ('pension_husband','פנסיה — בעל'),('pension_wife','פנסיה — אישה'),
 ('child_savings','חיסכון לכל ילד'),('housing_program','מחיר למשתכן'),
 ('investment_fund','קופת גמל להשקעה'),('tax_refund','החזרי מס'),('work_grant','מענק עבודה'),
 ('disability','ביטוח נכות'),('unemployment','אבטלה'),('maternity','תוספת דמי לידה'),
 ('municipal_discount','הנחה בארנונה'),('daycare_grade','השגת דרגה במעונות'),
 ('rent_assistance','סיוע בשכר דירה'),('rav_kav','הנחה ברב־קו'),('electricity','ניוד חשמל'),
 ('mortgage_refinance','מחזור משכנתא'),('water_household','עדכון נפשות במים'),
 ('bank_fees','משא ומתן על עמלות בנקים'),('credit_cards','כרטיסי אשראי');
create table f360.meeting_topic_checks(
 id uuid primary key default gen_random_uuid(),
 meeting_id uuid not null references public.meetings(id) on delete cascade,
 topic_key text not null references f360.meeting_topic_catalog(key),
 result text not null check(result in ('pending','not_relevant','no_action','follow_up')),
 note text not null default '' check(length(note)<=2000),
 followup_id uuid references f360.meeting_followups(id),
 revision integer not null default 1,
 updated_by uuid not null references public.profiles(id),
 updated_at timestamptz not null default now(),
 unique(meeting_id,topic_key)
);
alter table f360.meeting_topic_catalog enable row level security;
alter table f360.meeting_topic_checks enable row level security;
revoke all on f360.meeting_topic_catalog,f360.meeting_topic_checks from public,anon,authenticated;

create function public.rpc_save_meeting_topic(p_meeting_id uuid,p_topic_key text,p_result text,p_note text,p_expected_revision integer,p_followup jsonb default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session(); m public.meetings%rowtype; t f360.meeting_topic_checks%rowtype; title text; task_id uuid; task_data jsonb;
begin
 select * into m from public.meetings where id=p_meeting_id for update;
 if m.id is null or not public.staff_family_access(m.family_id) or not public.has_permission('families.edit') then
  raise exception 'PERMISSION_DENIED' using errcode='42501';
 end if;
 if m.status not in ('in_progress','completed') then raise exception 'INVALID_STATE'; end if;
 select c.title into title from f360.meeting_topic_catalog c where c.key=p_topic_key;
 if title is null or p_result is null or p_result not in ('pending','not_relevant','no_action','follow_up') or p_note is null or length(p_note)>2000 then raise exception 'VALIDATION'; end if;
 select * into t from f360.meeting_topic_checks where meeting_id=m.id and topic_key=p_topic_key for update;
 if coalesce(t.revision,0) is distinct from p_expected_revision then raise exception 'CONFLICT'; end if;
 task_id:=t.followup_id;
 -- Never silently discard an open commitment when changing the screening result.
 if p_result<>'follow_up' and exists(select 1 from f360.meeting_followups where id=task_id and status in ('open','in_progress')) then raise exception 'INVALID_STATE: close follow-up first'; end if;
 if p_followup is not null then
  if p_result<>'follow_up' or task_id is not null or jsonb_typeof(p_followup) is distinct from 'object' then raise exception 'VALIDATION'; end if;
  if exists(select 1 from jsonb_object_keys(p_followup) k where k not in ('title','details','owner_role','due_on','visible_to_client')) then raise exception 'VALIDATION'; end if;
  task_id:=gen_random_uuid();
  -- Same transaction, existing input validation, ownership and sharing rules.
  task_data:=public.rpc_save_meeting_followup(task_id,m.id,p_followup||jsonb_build_object('item_id',null),null);
 end if;
 if p_result='follow_up' and task_id is null then raise exception 'VALIDATION: follow-up required'; end if;
 insert into f360.meeting_topic_checks(meeting_id,topic_key,result,note,followup_id,updated_by)
 values(m.id,p_topic_key,p_result,p_note,task_id,pid)
 on conflict(meeting_id,topic_key) do update set result=excluded.result,note=excluded.note,followup_id=excluded.followup_id,revision=meeting_topic_checks.revision+1,updated_by=pid,updated_at=clock_timestamp()
 returning * into t;
 perform public.write_audit('save','meeting_topic_check',t.id,'','Meeting topic checked',jsonb_build_object('meeting_id',m.id,'topic_key',p_topic_key,'result',p_result));
 return to_jsonb(t);
end $$;
revoke all on function public.rpc_save_meeting_topic(uuid,text,text,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.rpc_save_meeting_topic(uuid,text,text,text,integer,jsonb) to authenticated;

-- Workspace extension appended below. All notes remain staff-only.
create or replace function public.rpc_workspace()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pid uuid:=public.require_session(); workspace_data jsonb; tasks jsonb; staff boolean:=public.current_role_name() in ('admin','representative');
begin
 workspace_data:=f360.rpc_workspace();
 select coalesce(jsonb_agg(row_data order by closed,due_on,id),'[]') into tasks from (
  select t.id,t.due_on,t.status in ('completed','cancelled') closed,
   jsonb_build_object('id',t.id,'meeting_id',t.meeting_id,'family_id',t.family_id,'item_id',t.item_id,
   'title',t.title,'details',t.details,'owner_role',t.owner_role,'owner_name',case when t.owner_role='client' then coalesce(c.name,'המשפחה') else coalesce(rp.name,'טרם שויך נציג') end,
   'due_on',t.due_on,'visible_to_client',t.visible_to_client,'status',t.status,'revision',t.revision,'updated_at',t.updated_at) row_data
  from f360.meeting_followups t join public.families f on f.id=t.family_id
  left join public.profiles c on c.id=f.client_profile_id
  left join public.representatives r on r.id=f.representative_id left join public.profiles rp on rp.id=r.profile_id
  where exists(select 1 from jsonb_array_elements(workspace_data->'families') visible_family where visible_family->>'id'=t.family_id::text)
   and ((staff and public.staff_family_access(t.family_id)) or (public.current_role_name()='client' and f.client_profile_id=pid and t.visible_to_client
    and (t.item_id is null or exists(select 1 from public.meeting_items where id=t.item_id and visible_to_client))))
  order by closed,t.due_on,t.id limit 1001
 ) q;
 workspace_data:=workspace_data||jsonb_build_object('topicChecksEnabled',staff,'topicChecks',coalesce((
 select jsonb_agg(jsonb_build_object('id',c.id,'meeting_id',c.meeting_id,'topic_key',c.topic_key,'result',c.result,'note',c.note,'followup_id',c.followup_id,'revision',c.revision,'updated_at',c.updated_at))
 from f360.meeting_topic_checks c join public.meetings m on m.id=c.meeting_id
 where staff and public.staff_family_access(m.family_id)
 and exists(select 1 from jsonb_array_elements(workspace_data->'meetings') visible_meeting where visible_meeting->>'id'=m.id::text)
 ),'[]'::jsonb));
 return workspace_data||jsonb_build_object('followUpsEnabled',true,'followUpsTruncated',jsonb_array_length(tasks)>1000,
 'followUps',case when jsonb_array_length(tasks)>1000 then tasks-1000 else tasks end);
end $$;

commit;
