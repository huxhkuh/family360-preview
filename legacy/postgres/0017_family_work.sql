begin;
create table f360.family_tasks(
 id uuid primary key, family_id uuid not null references public.families(id) on delete cascade,
 title text not null, details text not null default '',owner_role text not null check(owner_role in ('representative','client')),
 due_on date not null,visible_to_client boolean not null default false,status text not null default 'open' check(status in ('open','in_progress','completed','cancelled')),
 revision integer not null default 1,created_by uuid not null references public.profiles(id),updated_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(owner_role<>'client' or visible_to_client)
);
create index on f360.family_tasks(family_id,status,due_on);
create table f360.family_contacts(
 id uuid primary key,family_id uuid not null references public.families(id) on delete cascade,
 kind text not null check(kind in ('phone','meeting','message','other')),summary text not null,
 occurred_at timestamptz not null,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),
 next_task_id uuid references f360.family_tasks(id) deferrable initially deferred
);
create index on f360.family_contacts(family_id,occurred_at desc);
alter table f360.family_tasks enable row level security;
alter table f360.family_contacts enable row level security;
revoke all on f360.family_tasks,f360.family_contacts from public,anon,authenticated;

create function public.rpc_save_family_task(p_id uuid,p_family_id uuid,p_payload jsonb,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session();f public.families%rowtype;t f360.family_tasks%rowtype;
 label text;detail text;owner_kind text;deadline date;shared boolean;
begin
 select * into f from public.families where id=p_family_id for update;
 if f.id is null or (public.staff_family_access(f.id) and public.has_permission('families.edit')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if p_id is null or jsonb_typeof(p_payload) is distinct from 'object'
 or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('title','details','owner_role','due_on','visible_to_client'))
 or jsonb_typeof(p_payload->'title') is distinct from 'string' or jsonb_typeof(p_payload->'details') is distinct from 'string'
 or jsonb_typeof(p_payload->'owner_role') is distinct from 'string' or jsonb_typeof(p_payload->'due_on') is distinct from 'string'
 or jsonb_typeof(p_payload->'visible_to_client') is distinct from 'boolean' then raise exception 'VALIDATION'; end if;
 label:=trim(p_payload->>'title');detail:=p_payload->>'details';owner_kind:=p_payload->>'owner_role';shared:=(p_payload->>'visible_to_client')::boolean;
 if length(label) not between 3 and 200 or length(detail)>3000 or owner_kind not in ('representative','client')
 or p_payload->>'due_on' !~ '^\d{4}-\d{2}-\d{2}$' or (owner_kind='client' and not shared) then raise exception 'VALIDATION'; end if;
 deadline:=(p_payload->>'due_on')::date;
 if deadline<'2000-01-01' or deadline>current_date+interval '10 years' then raise exception 'VALIDATION'; end if;
 if (owner_kind='client' and not exists(select 1 from public.profiles where id=f.client_profile_id and active and role='client'))
 or (owner_kind='representative' and not exists(select 1 from public.representatives r join public.profiles p on p.id=r.profile_id where r.id=f.representative_id and r.active and p.active and p.role='representative')) then raise exception 'VALIDATION: active owner'; end if;
 select * into t from f360.family_tasks where id=p_id for update;
 if t.id is not null then
  if t.family_id<>f.id then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if p_expected_revision is null and t.title=label and t.details=detail and t.owner_role=owner_kind and t.due_on=deadline and t.visible_to_client=shared then return to_jsonb(t); end if;
  if t.revision is distinct from p_expected_revision then raise exception 'CONFLICT'; end if;
  if t.status not in ('open','in_progress') then raise exception 'INVALID_STATE'; end if;
  update f360.family_tasks set title=label,details=detail,owner_role=owner_kind,due_on=deadline,visible_to_client=shared,revision=revision+1,updated_at=clock_timestamp(),updated_by=pid where id=t.id returning * into t;
 else
  if p_expected_revision is not null then raise exception 'CONFLICT'; end if;
  if (select count(*) from f360.family_tasks where family_id=f.id and status in ('open','in_progress'))>=200 then raise exception 'VALIDATION: limit'; end if;
  insert into f360.family_tasks(id,family_id,title,details,owner_role,due_on,visible_to_client,created_by,updated_by)
  values(p_id,f.id,label,detail,owner_kind,deadline,shared,pid,pid) returning * into t;
 end if;
 perform public.write_audit('save','family_task',t.id,'','Family task saved',jsonb_build_object('family_id',f.id,'revision',t.revision));return to_jsonb(t);
end $$;

create function public.rpc_set_family_task_status(p_id uuid,p_status text,p_expected_revision integer)
returns void language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session();t f360.family_tasks%rowtype;staff boolean;
begin
 select * into t from f360.family_tasks where id=p_id for update;
 staff:=coalesce(public.staff_family_access(t.family_id) and public.has_permission('families.edit'),false);
 if t.id is null or (staff or (public.current_role_name()='client' and public.user_has_family_access(t.family_id) and t.visible_to_client and t.owner_role='client')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if p_status is null or p_status not in ('open','in_progress','completed','cancelled') or (not staff and p_status not in ('in_progress','completed')) then raise exception 'VALIDATION'; end if;
 if t.revision is distinct from p_expected_revision then raise exception 'CONFLICT'; end if;
 if not staff and t.status not in ('open','in_progress') then raise exception 'INVALID_STATE'; end if;
 update f360.family_tasks set status=p_status,revision=revision+1,updated_at=clock_timestamp(),updated_by=pid where id=t.id;
 perform public.write_audit('update','family_task',t.id,'','Family task status changed',jsonb_build_object('family_id',t.family_id,'status',p_status));
end $$;

create function public.rpc_record_family_contact(p_id uuid,p_family_id uuid,p_kind text,p_summary text,p_occurred_at timestamptz,p_next_task_id uuid default null,p_next_task jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session();f public.families%rowtype;old f360.family_contacts%rowtype;
begin
 select * into f from public.families where id=p_family_id for update;
 if f.id is null or (public.staff_family_access(f.id) and public.has_permission('families.edit')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if p_id is null or p_kind is null or p_kind not in ('phone','meeting','message','other') or length(trim(coalesce(p_summary,''))) not between 3 and 3000
 or p_occurred_at is null or not isfinite(p_occurred_at) or p_occurred_at>now()+interval '5 minutes' or p_occurred_at<'2000-01-01'
 or (p_next_task_id is null)<>(p_next_task is null) then raise exception 'VALIDATION'; end if;
 select * into old from f360.family_contacts where id=p_id for update;
 if old.id is not null then
  if old.family_id<>f.id or old.created_by<>pid then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if old.summary<>trim(p_summary) or old.kind<>p_kind or old.occurred_at<>p_occurred_at or old.next_task_id is distinct from p_next_task_id then raise exception 'CONFLICT'; end if;
 else
  insert into f360.family_contacts(id,family_id,kind,summary,occurred_at,created_by,next_task_id) values(p_id,f.id,p_kind,trim(p_summary),p_occurred_at,pid,p_next_task_id);
  perform public.write_audit('create','family_contact',p_id,'','Contact recorded',jsonb_build_object('family_id',f.id));
 end if;
 if p_next_task_id is not null then perform public.rpc_save_family_task(p_next_task_id,f.id,p_next_task,null); end if;
end $$;

alter function public.rpc_workspace() rename to rpc_workspace_questionnaire_v2;
alter function public.rpc_workspace_questionnaire_v2() set schema f360;
revoke all on function f360.rpc_workspace_questionnaire_v2() from public,anon,authenticated;
create function public.rpc_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;fam_ids uuid[];staff boolean;tasks jsonb;contacts jsonb;
begin
 perform public.require_session();result:=f360.rpc_workspace_questionnaire_v2();staff:=public.current_role_name() in ('admin','representative');
 select coalesce(array_agg((f->>'id')::uuid),'{}') into fam_ids from jsonb_array_elements(result->'families') f;
 select coalesce(jsonb_agg(row_data order by closed,due_on,id),'[]') into tasks from (
  select t.id,t.due_on,t.status in ('completed','cancelled') closed,
   (to_jsonb(t)-'created_by'-'updated_by')||jsonb_build_object('owner_name',case when t.owner_role='client' then f.name else coalesce(p.name,'הנציג המטפל') end) row_data
  from f360.family_tasks t join public.families f on f.id=t.family_id left join public.representatives r on r.id=f.representative_id left join public.profiles p on p.id=r.profile_id
  where t.family_id=any(fam_ids) and (staff or (public.current_role_name()='client' and t.visible_to_client))
  order by closed,t.due_on,t.id limit 1001
 ) rows;
 if staff then
  select coalesce(jsonb_agg(row_data order by occurred_at desc,id),'[]') into contacts from (
   select c.id,c.occurred_at,to_jsonb(c)||jsonb_build_object('author_name',p.name) row_data from f360.family_contacts c join public.profiles p on p.id=c.created_by
   where c.family_id=any(fam_ids) order by c.occurred_at desc,c.id limit 1001
  ) rows;
 else contacts:='[]';end if;
 return result||jsonb_build_object('familyWorkEnabled',true,'familyTasks',tasks,'familyContacts',contacts,'familyWorkTruncated',jsonb_array_length(tasks)>1000 or jsonb_array_length(contacts)>1000);
end $$;
revoke all on function public.rpc_save_family_task(uuid,uuid,jsonb,integer),public.rpc_set_family_task_status(uuid,text,integer),public.rpc_record_family_contact(uuid,uuid,text,text,timestamptz,uuid,jsonb),public.rpc_workspace() from public,anon,authenticated;
grant execute on function public.rpc_save_family_task(uuid,uuid,jsonb,integer),public.rpc_set_family_task_status(uuid,text,integer),public.rpc_record_family_contact(uuid,uuid,text,text,timestamptz,uuid,jsonb),public.rpc_workspace() to authenticated;
commit;
