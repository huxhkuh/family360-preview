begin;
-- Validate legacy RPCs before they reach their original implementation.
create or replace function public.validate_rpc_request(p_name text,p_args jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare m public.meetings%rowtype; s public.family_services%rowtype; d uuid; task_family uuid; task_professional uuid;
begin
 perform public.require_session();
 if length(p_args::text)>200000 then raise exception 'VALIDATION: request too large'; end if;
 -- A task ID is never an authorization token. Fail closed on SQL NULL as well.
 if p_args ? 'p_task_id' then
  if p_name in ('rpc_submit_analysis','rpc_save_analysis_draft') or (p_name='rpc_share_document' and p_args->>'p_kind'='analysis') then
   select family_id,professional_id into task_family,task_professional from public.analysis_tasks where id=(p_args->>'p_task_id')::uuid;
  else
   select family_id,professional_id into task_family,task_professional from public.execution_tasks where id=(p_args->>'p_task_id')::uuid;
  end if;
  if task_family is null or (public.staff_family_access(task_family) or task_professional=public.current_professional_id()) is not true then
   raise exception 'PERMISSION_DENIED' using errcode='42501';
  end if;
 end if;
 if p_name='rpc_finish_meeting' then
  select * into m from public.meetings where id=(p_args->>'p_meeting_id')::uuid for update;
  if m.id is null or not(public.staff_family_access(m.family_id) and public.has_permission('families.edit')) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if m.status<>'in_progress' then raise exception 'INVALID_STATE: meeting must be in progress'; end if;
  if exists(select 1 from public.meeting_items where meeting_id=m.id and visible_to_client and coalesce(client_decision,'undecided')='undecided') then raise exception 'UNDECIDED_ITEMS'; end if;
 elsif p_name='rpc_send_to_execution' then
  select * into s from public.family_services where id=(p_args->>'p_family_service_id')::uuid for update;
  if not exists(select 1 from public.meeting_items i join public.meetings approved_meeting on approved_meeting.id=i.meeting_id where i.family_service_id=s.id and i.client_decision='progress' and approved_meeting.status='completed') then raise exception 'INVALID_STATE: completed meeting approval required'; end if;
  for d in select value::uuid from jsonb_array_elements_text(coalesce(nullif(p_args->'p_document_ids','null'),'[]')) loop
   if not exists(select 1 from public.documents where id=d and family_id=s.family_id and status in ('approved','signed')) then raise exception 'PERMISSION_DENIED: document' using errcode='42501'; end if;
  end loop;
 elsif p_name='rpc_submit_analysis' then
  if not exists(select 1 from public.analysis_tasks where id=(p_args->>'p_task_id')::uuid and professional_id=public.current_professional_id()) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if jsonb_typeof(p_args->'p_payload')<>'object' then raise exception 'VALIDATION: payload'; end if;
  if exists(select 1 from (values('current_situation'),('recommendation'),('client_summary')) k(key)
     where length(trim(coalesce(p_args->'p_payload'->>key,'')))=0) then raise exception 'VALIDATION: required analysis fields'; end if;
 end if;
end $$;

-- Move implementations to a non-exposed schema. Every public RPC checks active
-- identity and MFA, including formerly unguarded legacy helper calls.
do $$ declare f record; arglist text; jsonargs text; impl text; begin
 for f in select p.oid,p.proname,p.proargnames,p.pronargs,pg_get_function_arguments(p.oid) args,
 pg_get_function_identity_arguments(p.oid) identity_args,pg_get_function_result(p.oid) result
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'rpc\_%' escape '\' loop
  select coalesce(string_agg('$'||i,', '),''),coalesce(string_agg(quote_literal(f.proargnames[i])||', $'||i,', '),'') into arglist,jsonargs from generate_series(1,f.pronargs)i;
  execute format('alter function public.%I(%s) set schema f360',f.proname,f.identity_args);
  impl:=format('begin perform public.validate_rpc_request(%L,jsonb_build_object(%s)); ',f.proname,jsonargs);
  if f.result='void' then impl:=impl||format('perform f360.%I(%s); return; end',f.proname,arglist);
  else impl:=impl||format('return f360.%I(%s); end',f.proname,arglist); end if;
  execute format('create function public.%I(%s) returns %s language plpgsql security definer set search_path=public as %L',f.proname,f.args,f.result,impl);
 end loop;
end $$;
revoke all on schema f360 from public,anon,authenticated;
revoke all on all functions in schema f360 from public,anon,authenticated;
revoke all on all functions in schema public from public,anon,authenticated;
alter default privileges in schema public revoke execute on functions from public;
-- Only RPC entrypoints and pure RLS helpers are exposed to authenticated callers.
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and (p.proname like 'rpc\_%' escape '\' or p.proname=any(array[
 'current_profile_id','current_role_name','is_admin','current_representative_id','current_professional_id',
 'has_permission','user_has_family_access','staff_family_access','pro_has_family_touch','pro_can_read_document',
 'storage_doc_readable','storage_doc_writable','storage_task_file_readable','can_upload_document'])) loop
  execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
-- Realtime publication is optional on the embedded test engine.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='notifications') then
  alter publication supabase_realtime add table public.notifications;
 end if;
end $$;
commit;
