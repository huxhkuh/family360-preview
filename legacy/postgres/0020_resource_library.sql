begin;
create table f360.resources(
 id uuid primary key,title text not null,description text not null default '',url text not null default '',phone text not null default '',
 chapter text not null,verified_at timestamptz,verified_by uuid references public.profiles(id),active boolean not null default true,
 revision integer not null default 1,updated_at timestamptz not null default now()
);
alter table f360.resources enable row level security;
revoke all on f360.resources from public,anon,authenticated;
create function public.rpc_save_resource(p_id uuid,p_payload jsonb,p_expected_revision integer default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session();r f360.resources%rowtype;label text;link text;phone_value text;chapter_value text;verified boolean;enabled boolean;
begin
 if public.is_admin() is not true then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 if p_id is null or jsonb_typeof(p_payload) is distinct from 'object'
 or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('title','description','url','phone','chapter','verified','active'))
 or exists(select 1 from (values('title'),('description'),('url'),('phone'),('chapter')) f(k) where jsonb_typeof(p_payload->k) is distinct from 'string')
 or jsonb_typeof(p_payload->'verified') is distinct from 'boolean' or jsonb_typeof(p_payload->'active') is distinct from 'boolean' then raise exception 'VALIDATION';end if;
 label:=trim(p_payload->>'title');link:=trim(p_payload->>'url');phone_value:=trim(p_payload->>'phone');chapter_value:=p_payload->>'chapter';verified:=(p_payload->>'verified')::boolean;enabled:=(p_payload->>'active')::boolean;
 if length(label) not between 2 and 150 or length(p_payload->>'description')>1000 or length(link)>2000
 or (link<>'' and (link !~ '^https://[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}([/?#][^[:space:]<>]*)?$' or link ~ '[[:cntrl:]]' or link ~* '^https://[^/]*(\.local|\.internal)([/?#]|$)'))
 or (phone_value<>'' and (length(phone_value)>30 or phone_value !~ '^\+?[0-9*][0-9* ()-]{2,28}[0-9]$'))
 or chapter_value not in ('general','family','work','housing','mortgage','savings','insurance','loans','rights','banks','weddings')
 or (link='' and phone_value='') then raise exception 'VALIDATION';end if;
 -- Serialize creation/cap checks, preserving stable IDs on retries.
 perform pg_advisory_xact_lock(360,20);
 select * into r from f360.resources where id=p_id for update;
 if r.id is not null then
  if p_expected_revision is null and r.title=label and r.description=p_payload->>'description' and r.url=link and r.phone=phone_value and r.chapter=chapter_value and r.active=enabled and (r.verified_at is not null)=verified then return to_jsonb(r);end if;
  if r.revision is distinct from p_expected_revision then raise exception 'CONFLICT';end if;
 else
  if p_expected_revision is not null then raise exception 'CONFLICT';end if;
  if (select count(*) from f360.resources)>=200 then raise exception 'VALIDATION: resource limit';end if;
 end if;
 insert into f360.resources(id,title,description,url,phone,chapter,verified_at,verified_by,active)
 values(p_id,label,p_payload->>'description',link,phone_value,chapter_value,case when verified then now() end,case when verified then pid end,enabled)
 on conflict(id) do update set title=excluded.title,description=excluded.description,url=excluded.url,phone=excluded.phone,chapter=excluded.chapter,
 verified_at=excluded.verified_at,verified_by=excluded.verified_by,active=excluded.active,revision=f360.resources.revision+1,updated_at=clock_timestamp() returning * into r;
 perform public.write_audit('save','resource',r.id,r.title,'Resource saved',jsonb_build_object('verified',verified,'active',enabled));
 return to_jsonb(r);
end $$;
create function public.rpc_list_resources(p_manage boolean default false) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 perform public.require_session();
 if p_manage is null then raise exception 'VALIDATION';end if;
 if p_manage and public.is_admin() is not true then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)-'verified_by' order by title,id) from f360.resources r where p_manage or (r.active and r.verified_at is not null)),'[]');
end $$;
revoke all on function public.rpc_save_resource(uuid,jsonb,integer),public.rpc_list_resources(boolean) from public,anon,authenticated;
grant execute on function public.rpc_save_resource(uuid,jsonb,integer),public.rpc_list_resources(boolean) to authenticated;
-- This capability is advertised only once the backing RPCs exist.
alter function public.rpc_workspace() rename to rpc_workspace_directory;
alter function public.rpc_workspace_directory() set schema f360;
revoke all on function f360.rpc_workspace_directory() from public,anon,authenticated;
create function public.rpc_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin return f360.rpc_workspace_directory()||jsonb_build_object('resourceLibraryEnabled',true);end $$;
revoke all on function public.rpc_workspace() from public,anon,authenticated;
grant execute on function public.rpc_workspace() to authenticated;
commit;
