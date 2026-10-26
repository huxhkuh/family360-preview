begin;
-- Follow-up coordination is separate from professional execution/approval.
-- Only RPC projections expose this private table; no direct browser access.
create table f360.meeting_followups (
 id uuid primary key,
 meeting_id uuid not null references public.meetings(id) on delete cascade,
 family_id uuid not null references public.families(id) on delete cascade,
 item_id uuid references public.meeting_items(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 200),
 details text not null default '' check(length(details)<=3000),
 owner_role text not null check(owner_role in ('client','representative')),
 due_on date not null,
 visible_to_client boolean not null default false,
 status text not null default 'open' check(status in ('open','in_progress','completed','cancelled')),
 revision integer not null default 1,
 created_by uuid not null references public.profiles(id),
 updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz,
 check(owner_role<>'client' or visible_to_client)
);
create index meeting_followups_due on f360.meeting_followups(family_id,status,due_on);
create index meeting_followups_meeting on f360.meeting_followups(meeting_id);
alter table f360.meeting_followups enable row level security;
revoke all on f360.meeting_followups from public,anon,authenticated;

create function public.rpc_save_meeting_followup(p_id uuid,p_meeting_id uuid,p_payload jsonb,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session(); m public.meetings%rowtype; t f360.meeting_followups%rowtype;
 topic uuid; label text; detail text; owner_kind text; deadline date; shared boolean;
begin
 select * into m from public.meetings where id=p_meeting_id for update;
 if m.id is null or (public.staff_family_access(m.family_id) and public.has_permission('families.edit')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if m.status not in ('in_progress','completed') then raise exception 'INVALID_STATE'; end if;
 if p_id is null or jsonb_typeof(p_payload) is distinct from 'object'
 or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('title','details','owner_role','due_on','visible_to_client','item_id'))
 or jsonb_typeof(p_payload->'title') is distinct from 'string'
 or jsonb_typeof(p_payload->'owner_role') is distinct from 'string'
 or jsonb_typeof(p_payload->'due_on') is distinct from 'string'
 or jsonb_typeof(p_payload->'visible_to_client') is distinct from 'boolean'
 or (p_payload ? 'details' and jsonb_typeof(p_payload->'details') is distinct from 'string')
 then raise exception 'VALIDATION'; end if;
 label:=trim(p_payload->>'title'); detail:=coalesce(p_payload->>'details',''); owner_kind:=p_payload->>'owner_role';
 shared:=(p_payload->>'visible_to_client')::boolean; topic:=nullif(p_payload->>'item_id','')::uuid;
 if length(label) not between 3 and 200 or length(detail)>3000 or owner_kind not in ('client','representative')
 or p_payload->>'due_on' !~ '^\d{4}-\d{2}-\d{2}$' or (owner_kind='client' and not shared) then raise exception 'VALIDATION'; end if;
 deadline:=(p_payload->>'due_on')::date;
 if (owner_kind='client' and not exists(select 1 from public.families f join public.profiles p on p.id=f.client_profile_id where f.id=m.family_id and p.active and p.role='client'))
 or (owner_kind='representative' and not exists(select 1 from public.families f join public.representatives r on r.id=f.representative_id join public.profiles p on p.id=r.profile_id where f.id=m.family_id and r.active and p.active and p.role='representative')) then raise exception 'VALIDATION: active owner required'; end if;
 if deadline<'2000-01-01'::date or deadline>(current_date+interval '10 years')::date then raise exception 'VALIDATION'; end if;
 if topic is not null and not exists(select 1 from public.meeting_items where id=topic and meeting_id=m.id and family_id=m.family_id and (not shared or visible_to_client)) then raise exception 'VALIDATION: topic'; end if;
 select * into t from f360.meeting_followups where id=p_id for update;
 if t.id is not null then
  if t.meeting_id<>m.id then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  -- A retry of an already successful create does not create a duplicate.
  if p_expected_revision is null and t.title=label and t.details=detail and t.owner_role=owner_kind and t.due_on=deadline and t.visible_to_client=shared and t.item_id is not distinct from topic then return to_jsonb(t); end if;
  if t.revision is distinct from p_expected_revision then raise exception 'CONFLICT'; end if;
  if t.status not in ('open','in_progress') then raise exception 'INVALID_STATE'; end if;
  update f360.meeting_followups set title=label,details=detail,owner_role=owner_kind,due_on=deadline,visible_to_client=shared,item_id=topic,revision=revision+1,updated_at=clock_timestamp(),updated_by=pid where id=t.id returning * into t;
 else
  if p_expected_revision is not null then raise exception 'CONFLICT'; end if;
  if (select count(*) from f360.meeting_followups where meeting_id=m.id)>=200 then raise exception 'VALIDATION: limit'; end if;
  insert into f360.meeting_followups(id,meeting_id,family_id,item_id,title,details,owner_role,due_on,visible_to_client,created_by,updated_by)
  values(p_id,m.id,m.family_id,topic,label,detail,owner_kind,deadline,shared,pid,pid) returning * into t;
 end if;
 perform public.write_audit('save','meeting_followup',t.id,'','Follow-up saved',jsonb_build_object('meeting_id',m.id,'revision',t.revision));
 return to_jsonb(t);
end $$;

create function public.rpc_set_followup_status(p_id uuid,p_status text,p_expected_revision integer)
returns void language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session(); t f360.meeting_followups%rowtype; staff boolean;
begin
 select * into t from f360.meeting_followups where id=p_id for update;
 staff:=coalesce(public.staff_family_access(t.family_id) and public.has_permission('families.edit'),false);
 if t.id is null or (not staff and not (
  public.current_role_name()='client' and t.owner_role='client' and t.visible_to_client
  and exists(select 1 from public.families where id=t.family_id and client_profile_id=pid)
  and (t.item_id is null or exists(select 1 from public.meeting_items where id=t.item_id and visible_to_client))
 )) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if p_status is null or p_status not in ('open','in_progress','completed','cancelled') or (not staff and p_status='cancelled') then raise exception 'VALIDATION'; end if;
 if not exists(select 1 from public.meetings where id=t.meeting_id and status in ('in_progress','completed')) then raise exception 'INVALID_STATE'; end if;
 if t.revision is distinct from p_expected_revision then raise exception 'CONFLICT'; end if;
 if not staff and t.status in ('completed','cancelled') then raise exception 'INVALID_STATE'; end if;
 update f360.meeting_followups set status=p_status,revision=revision+1,updated_at=clock_timestamp(),updated_by=pid,completed_at=case when p_status='completed' then now() else null end where id=t.id;
 perform public.write_audit('status','meeting_followup',t.id,'','Follow-up status changed',jsonb_build_object('status',p_status));
end $$;

-- Preserve the existing authorized workspace and add an explicit public projection.
create or replace function public.rpc_workspace()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pid uuid:=public.require_session(); result jsonb; tasks jsonb; staff boolean:=public.current_role_name() in ('admin','representative');
begin
 result:=f360.rpc_workspace();
 select coalesce(jsonb_agg(row_data order by closed,due_on,id),'[]') into tasks from (
  select t.id,t.due_on,t.status in ('completed','cancelled') closed,
   jsonb_build_object('id',t.id,'meeting_id',t.meeting_id,'family_id',t.family_id,'item_id',t.item_id,
   'title',t.title,'details',t.details,'owner_role',t.owner_role,'owner_name',case when t.owner_role='client' then coalesce(c.name,'המשפחה') else coalesce(rp.name,'טרם שויך נציג') end,
   'due_on',t.due_on,'visible_to_client',t.visible_to_client,'status',t.status,'revision',t.revision,'updated_at',t.updated_at) row_data
  from f360.meeting_followups t join public.families f on f.id=t.family_id
  left join public.profiles c on c.id=f.client_profile_id
  left join public.representatives r on r.id=f.representative_id left join public.profiles rp on rp.id=r.profile_id
  where exists(select 1 from jsonb_array_elements(result->'families') visible_family where visible_family->>'id'=t.family_id::text)
   and ((staff and public.staff_family_access(t.family_id)) or (public.current_role_name()='client' and f.client_profile_id=pid and t.visible_to_client
    and (t.item_id is null or exists(select 1 from public.meeting_items where id=t.item_id and visible_to_client))))
  order by closed,t.due_on,t.id limit 1001
 ) q;
 return result||jsonb_build_object('followUpsEnabled',true,'followUpsTruncated',jsonb_array_length(tasks)>1000,
 'followUps',case when jsonb_array_length(tasks)>1000 then tasks-1000 else tasks end);
end $$;
revoke all on function public.rpc_save_meeting_followup(uuid,uuid,jsonb,integer),public.rpc_set_followup_status(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.rpc_save_meeting_followup(uuid,uuid,jsonb,integer),public.rpc_set_followup_status(uuid,text,integer) to authenticated;
commit;
