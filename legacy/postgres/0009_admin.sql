begin;
create or replace function public.rpc_admin_save(p_entity text,p_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare allowed text[]; k text; setters text; columns_sql text; values_sql text; result jsonb; r record;
begin
 perform public.require_session();
 if not public.is_admin() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if jsonb_typeof(p_patch)<>'object' or length(p_patch::text)>100000 or p_patch='{}' then raise exception 'VALIDATION: object required'; end if;
 allowed:=case p_entity
 when 'profiles' then array['name','phone','role','active']
 when 'representatives' then array['active','permissions']
 when 'professionals' then array['business_name','active','analysis_enabled','execution_enabled','analysis_sla_hours','execution_sla_hours']
 when 'services' then array['key','name','icon','category','description','active','sort_order','analysis_sla_hours','execution_sla_hours','trigger_conditions','client_fields','required_documents','professional_fields','analysis_result_fields','automation_settings']
 when 'document_types' then array['key','name','type','description','active','sort_order']
 when 'automations' then array['key','name','event_key','active','delay_minutes','channel','settings']
 when 'message_templates' then array['key','name','subject','body','active']
 else null end;
 if allowed is null then raise exception 'VALIDATION: entity'; end if;
 for k in select jsonb_object_keys(p_patch) loop
  if not(k=any(allowed)) then raise exception 'VALIDATION: field %',k; end if;
 end loop;
 if p_patch ? 'name' and length(trim(p_patch->>'name')) not between 1 and 200 then raise exception 'VALIDATION: name'; end if;
 if p_patch ? 'permissions' and (jsonb_typeof(p_patch->'permissions')<>'array' or exists(select 1 from jsonb_array_elements_text(p_patch->'permissions') p where p not in
 ('families.edit','families.view_all','analysis.send','analysis.approve','execution.send','execution.approve','documents.manage'))) then raise exception 'VALIDATION: permissions'; end if;
 foreach k in array array['trigger_conditions','client_fields','required_documents','professional_fields','analysis_result_fields'] loop
  if p_patch ? k and jsonb_typeof(p_patch->k)<>'array' then raise exception 'VALIDATION: array %',k; end if;
 end loop;
 if p_entity='profiles' and p_id=public.current_profile_id() and (p_patch ? 'role' or p_patch ? 'active') then raise exception 'INVALID_STATE: cannot revoke own administration'; end if;
 if p_entity='profiles' and p_id is null then raise exception 'VALIDATION: create Auth user first'; end if;
 select string_agg(format('%I = input.%I',key,key),', '),string_agg(format('%I',key),', '),string_agg(format('input.%I',key),', ')
 into setters,columns_sql,values_sql from jsonb_object_keys(p_patch) key;
 if p_id is null then
  execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) input returning to_jsonb(%I.*)',p_entity,columns_sql,values_sql,p_entity,p_entity) into result using p_patch;
 else
  execute format('update public.%I target set %s from jsonb_populate_record(null::public.%I,$1) input where target.id=$2 returning to_jsonb(target.*)',p_entity,setters,p_entity) into result using p_patch,p_id;
  if result is null then raise exception 'NOT_FOUND'; end if;
 end if;
 if p_entity='profiles' and result->>'role'='representative' then insert into public.representatives(profile_id) values((result->>'id')::uuid) on conflict do nothing;
 elsif p_entity='profiles' and result->>'role'='professional' then insert into public.professionals(profile_id,business_name) values((result->>'id')::uuid,result->>'name') on conflict do nothing; end if;
 perform public.write_audit('update',p_entity,(result->>'id')::uuid,coalesce(result->>'name',''),'Admin update',jsonb_build_object('fields',to_jsonb(array(select jsonb_object_keys(p_patch)))));
 return result;
end $$;

create or replace function public.rpc_set_professional_service(p_professional_id uuid,p_service_id uuid,p_analysis boolean,p_execution boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.require_session();
 if not public.is_admin() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 insert into public.professional_services(professional_id,service_id,analysis_enabled,execution_enabled) values(p_professional_id,p_service_id,p_analysis,p_execution)
 on conflict(professional_id,service_id) do update set analysis_enabled=excluded.analysis_enabled,execution_enabled=excluded.execution_enabled;
 perform public.write_audit('update','professional',p_professional_id,'','Service eligibility updated');
end $$;
create or replace function public.rpc_set_setting(p_key text,p_value jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.require_session();
 if not public.is_admin() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if p_key not in ('system_name','support_email','default_analysis_sla','default_execution_sla') or length(p_value::text)>500 then raise exception 'VALIDATION: setting'; end if;
 if p_key in ('default_analysis_sla','default_execution_sla') and (p_value#>>'{}')::integer not between 1 and 8760 then raise exception 'VALIDATION: SLA'; end if;
 insert into public.system_settings(key,value,updated_by) values(p_key,p_value,public.current_profile_id())
 on conflict(key) do update set value=excluded.value,updated_at=now(),updated_by=excluded.updated_by;
 perform public.write_audit('update','setting',null,p_key,'Setting updated');
end $$;
commit;
