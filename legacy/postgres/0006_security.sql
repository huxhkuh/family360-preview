-- Applies after 0001..0005; also hardens databases installed from the old files.
begin;
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(auth_user_id,role,name,email)
  values(new.id,'client',left(coalesce(nullif(new.raw_user_meta_data->>'name',''),split_part(new.email,'@',1),'User'),200),new.email)
  on conflict(auth_user_id) do nothing;
  return new;
end $$;

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path=public as $$
  select p.id from public.profiles p where p.auth_user_id=auth.uid() and p.active
  and (p.role<>'admin' or coalesce(auth.jwt()->>'aal','')='aal2')
  and (p.role<>'representative' or exists(select 1 from public.representatives r where r.profile_id=p.id and r.active))
  and (p.role<>'professional' or exists(select 1 from public.professionals r where r.profile_id=p.id and r.active));
$$;
create or replace function public.current_role_name()
returns text language sql stable security definer set search_path=public as $$
  select role from public.profiles where id=public.current_profile_id();
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(public.current_role_name()='admin',false);
$$;
create or replace function public.current_representative_id()
returns uuid language sql stable security definer set search_path=public as $$
  select id from public.representatives where profile_id=public.current_profile_id() and active and public.current_role_name()='representative';
$$;
create or replace function public.current_professional_id()
returns uuid language sql stable security definer set search_path=public as $$
  select id from public.professionals where profile_id=public.current_profile_id() and active and public.current_role_name()='professional';
$$;
create or replace function public.has_permission(permission_key text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or (public.current_role_name()='representative' and coalesce((select permissions ? permission_key from public.representatives
    where profile_id=public.current_profile_id() and active),false));
$$;
create or replace function public.staff_family_access(fam_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.current_role_name() in ('admin','representative') and public.user_has_family_access(fam_id);
$$;
create or replace function public.require_session()
returns uuid language plpgsql stable security definer set search_path=public as $$
declare pid uuid;
begin
  if exists(select 1 from public.profiles where auth_user_id=auth.uid() and active and role='admin')
     and coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'MFA_REQUIRED' using errcode='42501'; end if;
  pid:=public.current_profile_id();
  if pid is null then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  return pid;
end $$;
create or replace function public.is_professional_eligible(pro_id uuid,svc_id uuid,mode text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.professionals pr join public.profiles p on p.id=pr.profile_id
  join public.professional_services ps on ps.professional_id=pr.id where pr.id=pro_id and ps.service_id=svc_id
  and pr.active and p.active and p.role='professional' and case mode
    when 'analysis' then pr.analysis_enabled and ps.analysis_enabled
    when 'execution' then pr.execution_enabled and ps.execution_enabled else false end);
$$;
-- Explicit table grants; all business writes go through validated RPCs.
revoke all on all tables in schema public from anon;
revoke insert,update,delete,truncate,references,trigger on all tables in schema public from authenticated;
revoke update(name,email,phone) on public.profiles from authenticated;
grant select on public.profiles,public.families,public.family_services,public.documents,
 public.analysis_tasks,public.execution_tasks,public.meetings,public.meeting_items,
 public.services,public.professionals,public.representatives,public.professional_services,
 public.document_types,public.task_documents,public.timeline_events,public.notifications,
 public.execution_updates,public.execution_messages,public.system_settings,
 public.message_templates,public.automations,public.audit_log,public.email_logs to authenticated;

drop policy profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated
  using(auth_user_id=auth.uid() or public.is_admin());
drop policy families_read on public.families;
create policy families_read on public.families for select to authenticated using(public.staff_family_access(id));
drop policy at_read on public.analysis_tasks;
create policy at_read on public.analysis_tasks for select to authenticated
 using(public.staff_family_access(family_id) or professional_id=public.current_professional_id());
drop policy et_read on public.execution_tasks;
create policy et_read on public.execution_tasks for select to authenticated
 using(public.staff_family_access(family_id) or professional_id=public.current_professional_id());
drop policy tl_read on public.timeline_events;
create policy tl_read on public.timeline_events for select to authenticated using(public.staff_family_access(family_id));
drop policy mi_read on public.meeting_items;
create policy mi_read on public.meeting_items for select to authenticated using(public.staff_family_access(family_id));
drop policy meetings_read on public.meetings;
create policy meetings_read on public.meetings for select to authenticated using(public.staff_family_access(family_id));
drop policy fs_read on public.family_services;
create policy fs_read on public.family_services for select to authenticated using(public.staff_family_access(family_id));
drop policy pros_read on public.professionals;
create policy pros_read on public.professionals for select to authenticated using(public.is_admin());
drop policy email_read on public.email_logs;
create policy email_read on public.email_logs for select to authenticated using(public.is_admin());
drop policy settings_read on public.system_settings;
create policy settings_read on public.system_settings for select to authenticated using(public.is_admin());
-- UPDATE/ALL policies are removed as well; grants alone are not the policy boundary.
do $$ declare p record; begin
  for p in select policyname,tablename from pg_policies where schemaname='public' and cmd in ('ALL','INSERT','UPDATE','DELETE') loop
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
end $$;

-- Revocation follows the current assignment even for historical shares.
create or replace function public.pro_can_read_document(doc_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.task_documents td
 left join public.analysis_tasks a on a.id=td.analysis_task_id
 left join public.execution_tasks e on e.id=td.execution_task_id
 where td.document_id=doc_id and td.revoked_at is null
 and coalesce(a.professional_id,e.professional_id)=public.current_professional_id()
 and coalesce(a.status,e.status) not in ('reassigned','cancelled'));
$$;
create or replace function public.storage_task_file_readable(p_task_id uuid,p_kind text)
returns boolean language sql stable security definer set search_path=public as $$
 select case when p_kind='analysis' then exists(select 1 from public.analysis_tasks t where t.id=p_task_id
  and (public.staff_family_access(t.family_id) or (t.professional_id=public.current_professional_id() and t.status<>'reassigned')))
 when p_kind='execution' then exists(select 1 from public.execution_tasks t where t.id=p_task_id
  and (public.staff_family_access(t.family_id) or (t.professional_id=public.current_professional_id() and t.status not in ('cancelled','reassigned'))))
 else false end;
$$;
-- Immutable object paths, backed by a document row. Invalid paths fail closed.
create or replace function public.can_upload_document(p_name text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare fam uuid; doc uuid;
begin
 fam:=split_part(p_name,'/',1)::uuid; doc:=split_part(p_name,'/',2)::uuid;
 return exists(select 1 from public.documents d join public.families f on f.id=d.family_id
  where d.id=doc and d.family_id=fam and d.type='file' and
  ((public.has_permission('documents.manage') and public.staff_family_access(fam)) or f.client_profile_id=public.current_profile_id()));
exception when invalid_text_representation then return false;
end $$;
drop policy fd_insert on storage.objects;
drop policy fd_update on storage.objects;
create policy fd_insert on storage.objects for insert to authenticated with check(bucket_id='family-documents' and public.can_upload_document(name));
-- No upsert: replacing a file never destroys an old version.
create or replace function public.rpc_replace_document_file(p_document_id uuid,p_storage_path text,p_file_name text,p_file_size bigint default null,p_mime text default null)
returns public.documents language plpgsql security definer set search_path=public as $$
declare d public.documents%rowtype; obj record; objname text;
begin
 perform public.require_session();
 select * into d from public.documents where id=p_document_id for update;
 objname:=substring(p_storage_path from length('family-documents/')+1);
 if d.id is null or split_part(p_storage_path,'/',1)<>'family-documents' or split_part(objname,'/',2)<>d.id::text
 or not public.can_upload_document(objname) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 select metadata into obj from storage.objects where bucket_id='family-documents' and name=objname;
 if not found or coalesce(p_file_size,0)<=0 or p_file_size>20971520 or length(p_file_name)>240
 or p_mime not in ('application/pdf','image/jpeg','image/png','image/webp')
 or (obj.metadata->>'size')::bigint is distinct from p_file_size
 or obj.metadata->>'mimetype' is distinct from p_mime then raise exception 'VALIDATION: uploaded file mismatch'; end if;
 update public.documents set storage_path=p_storage_path,file_name=p_file_name,file_size=p_file_size,mime_type=p_mime,
 status='pending',uploaded_at=now(),approved_at=null,reject_reason=null where id=d.id returning * into d;
 perform public.write_audit('replace','document',d.id,d.name,'Document uploaded');
 return d;
end $$;
update storage.buckets set public=false,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp']
 where id in ('family-documents','analysis-attachments','execution-attachments');
commit;
