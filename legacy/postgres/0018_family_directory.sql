begin;
-- Shared projections for the global window and an explicitly authorized family.
-- Projection is enforced here, not by hiding fields in the browser.
create or replace function f360.workspace_base(p_family_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pid uuid:=public.require_session(); role_name text:=public.current_role_name(); staff boolean;
 fam_ids uuid[]; result jsonb;
begin
 staff:=role_name in ('admin','representative');
 select coalesce(array_agg(id),'{}') into fam_ids from (select id from public.families f
 where (public.user_has_family_access(f.id) or (role_name='professional' and public.pro_has_family_touch(f.id)))
 and (p_family_id is null or f.id=p_family_id) order by created_at desc,id desc limit 500) q;
 if p_family_id is not null and not p_family_id=any(fam_ids) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 result:=jsonb_build_object(
 'profile',(select to_jsonb(p)-'auth_user_id' from public.profiles p where p.id=pid),
 'permissions',case when role_name='admin' then '["*"]'::jsonb else coalesce((select permissions from public.representatives where profile_id=pid),'[]') end,
 'families',coalesce((select jsonb_agg(case when staff then to_jsonb(f) when role_name='client' then to_jsonb(f)-'internal_notes'
 else jsonb_build_object('id',f.id,'name',f.name,'case_number',f.case_number,'status',f.status) end order by f.created_at desc)
 from public.families f where id=any(fam_ids)),'[]'),
 'services',coalesce((select jsonb_agg(to_jsonb(s) order by sort_order) from public.services s),'[]'),
 'familyServices',coalesce((select jsonb_agg(case when staff then to_jsonb(s) else to_jsonb(s)-'internal_note' end)
 from public.family_services s where s.family_id=any(fam_ids) and (staff or role_name='client' or s.professional_id=public.current_professional_id())),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.documents d where family_id=any(fam_ids)
 and (staff or role_name='client' or public.pro_can_read_document(d.id))),'[]'),
 'analysisTasks',coalesce((select jsonb_agg(to_jsonb(t)) from public.analysis_tasks t where family_id=any(fam_ids)
 and (staff or t.professional_id=public.current_professional_id())),'[]'),
 'executionTasks',coalesce((select jsonb_agg(to_jsonb(t)) from public.execution_tasks t where family_id=any(fam_ids)
 and (staff or t.professional_id=public.current_professional_id())),'[]'),
 'meetings',coalesce((select jsonb_agg(case when staff then to_jsonb(m) else to_jsonb(m)-'note'-'cancel_reason' end)
 from public.meetings m where family_id=any(fam_ids) and (staff or role_name='client')),'[]'),
 'meetingItems',coalesce((select jsonb_agg(case when staff then to_jsonb(m)
 else to_jsonb(m)-'representative_note'-'decision_note'-'execution_instructions'-'attachments' end)
 from public.meeting_items m where family_id=any(fam_ids) and (staff or (role_name='client' and visible_to_client))),'[]'),
 'professionals',case when staff then coalesce((select jsonb_agg((to_jsonb(p)-'commercial_note'-'internal_note'-'agreement_type')
 ||jsonb_build_object('name',r.name,'email',r.email,'profile_active',r.active)) from public.professionals p join public.profiles r on r.id=p.profile_id),'[]') else '[]'::jsonb end,
 'professionalServices',case when staff then coalesce((select jsonb_agg(to_jsonb(s)) from public.professional_services s),'[]') else '[]'::jsonb end,
 'representatives',case when staff then coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'profile_id',r.profile_id,'name',p.name,'active',r.active,'permissions',case when public.is_admin() then r.permissions else '[]' end))
 from public.representatives r join public.profiles p on p.id=r.profile_id),'[]') else '[]'::jsonb end,
 'profiles',case when public.is_admin() then coalesce((select jsonb_agg(to_jsonb(p)-'auth_user_id') from public.profiles p),'[]') else '[]'::jsonb end,
 'notifications',coalesce((select jsonb_agg(to_jsonb(n)) from (select * from public.notifications where profile_id=pid order by created_at desc limit 100)n),'[]'),
 'timeline',case when staff then coalesce((select jsonb_agg(to_jsonb(n)) from (select * from public.timeline_events where family_id=any(fam_ids) order by created_at desc limit 200)n),'[]') else '[]'::jsonb end,
 'audit',case when public.is_admin() then coalesce((select jsonb_agg(to_jsonb(n)) from (select * from public.audit_log order by created_at desc limit 200)n),'[]') else '[]'::jsonb end,
 'settings',case when public.is_admin() then coalesce((select jsonb_object_agg(key,value) from public.system_settings),'{}') else '{}'::jsonb end,
 'automations',case when staff then coalesce((select jsonb_agg(to_jsonb(n)) from public.automations n),'[]') else '[]'::jsonb end,
 'templates',case when staff then coalesce((select jsonb_agg(to_jsonb(n)) from public.message_templates n),'[]') else '[]'::jsonb end,
 'documentTypes',coalesce((select jsonb_agg(to_jsonb(n)) from public.document_types n where active),'[]'),
 'limit',500);
 return result;
end $$;


create function f360.workspace_followups(workspace_data jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pid uuid:=public.require_session(); tasks jsonb; staff boolean:=public.current_role_name() in ('admin','representative');
begin

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

create function f360.workspace_activity(result jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare fam_ids uuid[];staff boolean;tasks jsonb;contacts jsonb;
begin
 perform public.require_session();staff:=public.current_role_name() in ('admin','representative');
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

create function f360.workspace_scoped(p_family_id uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 perform public.require_session();
 return f360.workspace_activity(f360.workspace_followups(f360.workspace_base(p_family_id)))||jsonb_build_object(
 'workflowV2Enabled',true,'questionnaireV2Enabled',true,'familyDirectoryEnabled',true,'activityFeedEnabled',true,
 'scopedFamilyId',p_family_id,'familiesTruncated',p_family_id is null and (select count(*)>500 from public.families f where public.user_has_family_access(f.id) or (public.current_role_name()='professional' and public.pro_has_family_touch(f.id))));
end $$;
create or replace function public.rpc_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin return f360.workspace_scoped(null);end $$;
create function public.rpc_family_workspace(p_family_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 perform public.require_session();
 if p_family_id is null or public.current_role_name() not in ('admin','representative','client') then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 return f360.workspace_scoped(p_family_id);
end $$;
create function f360.phone_search_key(value text) returns text language sql immutable as $$
 select case when n ~ '^(00)?972[1-9][0-9]{7,8}$' then '0'||regexp_replace(n,'^(00)?972','') else n end from (select regexp_replace(coalesce(value,''),'[^0-9]','','g') n) s
$$;
create function public.rpc_search_families(p_query text default '',p_cursor jsonb default null,p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare q text:=lower(trim(coalesce(p_query,'')));query_phone text;rows jsonb;last_row jsonb;cursor_time timestamptz;cursor_id uuid;
begin
 perform public.require_session();
 if public.current_role_name() not in ('admin','representative','client') then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 if length(q)>150 or p_limit is null or p_limit not between 1 and 50 then raise exception 'VALIDATION';end if;
 if p_cursor is not null then
  if jsonb_typeof(p_cursor) is distinct from 'object' or p_cursor->>'created_at' is null or p_cursor->>'id' is null then raise exception 'VALIDATION';end if;
  cursor_time:=(p_cursor->>'created_at')::timestamptz;cursor_id:=(p_cursor->>'id')::uuid;
  if not isfinite(cursor_time) then raise exception 'VALIDATION';end if;
 end if;
 if q ~ '^[+0-9 ().-]+$' then query_phone:=nullif(f360.phone_search_key(q),'');end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by created_at desc,id desc),'[]') into rows from (
  select f.id,f.name,f.case_number,f.status,f.created_at from public.families f where public.user_has_family_access(f.id)
  and (q='' or strpos(lower(f.name),q)>0 or strpos(lower(f.case_number),q)>0 or strpos(lower(coalesce(f.contact_name,'')),q)>0 or strpos(lower(coalesce(f.email,'')),q)>0 or (query_phone is not null and strpos(f360.phone_search_key(f.phone),query_phone)>0))
  and (p_cursor is null or (f.created_at,f.id)<(cursor_time,cursor_id)) order by f.created_at desc,f.id desc limit p_limit+1
 ) r;
 if jsonb_array_length(rows)>p_limit then rows:=rows-p_limit;last_row:=rows->(p_limit-1);end if;
 return jsonb_build_object('items',rows,'next',case when last_row is not null then jsonb_build_object('created_at',last_row->>'created_at','id',last_row->>'id') else null end);
end $$;
create index if not exists families_directory_order on public.families(created_at desc,id desc);
revoke all on function f360.workspace_base(uuid),f360.workspace_followups(jsonb),f360.workspace_activity(jsonb),f360.workspace_scoped(uuid),f360.phone_search_key(text) from public,anon,authenticated;
revoke all on function public.rpc_family_workspace(uuid),public.rpc_search_families(text,jsonb,integer),public.rpc_workspace() from public,anon,authenticated;
grant execute on function public.rpc_family_workspace(uuid),public.rpc_search_families(text,jsonb,integer),public.rpc_workspace() to authenticated;
commit;
