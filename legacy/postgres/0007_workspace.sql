begin;
-- Projection is enforced here, not by hiding fields in the browser.
create or replace function public.rpc_workspace()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pid uuid:=public.require_session(); role_name text:=public.current_role_name(); staff boolean;
 fam_ids uuid[]; result jsonb;
begin
 staff:=role_name in ('admin','representative');
 select coalesce(array_agg(id),'{}') into fam_ids from (select id from public.families f
 where public.user_has_family_access(f.id) or (role_name='professional' and public.pro_has_family_touch(f.id))
 order by created_at desc limit 500) q;
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

create or replace function public.rpc_create_family(p_name text,p_client_profile_id uuid,p_representative_id uuid,p_phone text default null,p_email text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare f public.families%rowtype;
begin
 perform public.require_session();
 if not public.has_permission('families.edit') or (not public.is_admin() and p_representative_id is distinct from public.current_representative_id()) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if length(trim(p_name)) not between 2 and 150 or length(coalesce(p_phone,''))>30 or length(coalesce(p_email,''))>254
 or not exists(select 1 from public.profiles where id=p_client_profile_id and role='client' and active)
 or not exists(select 1 from public.representatives where id=p_representative_id and active)
 then raise exception 'VALIDATION: family fields'; end if;
 insert into public.families(name,case_number,client_profile_id,representative_id,phone,email)
 values(trim(p_name),'F-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_client_profile_id,p_representative_id,p_phone,p_email) returning * into f;
 perform public.write_audit('create','family',f.id,f.name,'Family created');
 return to_jsonb(f);
end $$;

create or replace function public.rpc_save_family(p_family_id uuid,p_patch jsonb,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path=public as $$
declare f public.families%rowtype;
begin
 perform public.require_session();
 select * into f from public.families where id=p_family_id for update;
 if not public.user_has_family_access(p_family_id) or (public.current_role_name()<>'client' and not public.has_permission('families.edit')) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if f.updated_at is distinct from p_expected_updated_at then raise exception 'CONFLICT: reload before saving'; end if;
 if jsonb_typeof(p_patch)<>'object' or length(p_patch::text)>100000 or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('answers','phone','email','contact_name','internal_notes'))
 or (public.current_role_name()='client' and p_patch ? 'internal_notes')
 or (p_patch ? 'answers' and jsonb_typeof(p_patch->'answers')<>'object') then raise exception 'VALIDATION: family fields'; end if;
 update public.families set answers=coalesce(p_patch->'answers',answers),phone=coalesce(p_patch->>'phone',phone),email=coalesce(p_patch->>'email',email),
 contact_name=coalesce(p_patch->>'contact_name',contact_name),internal_notes=coalesce(p_patch->>'internal_notes',internal_notes) where id=f.id returning * into f;
 perform public.write_audit('update','family',f.id,f.name,'Family updated');
 return case when public.current_role_name()='client' then to_jsonb(f)-'internal_notes' else to_jsonb(f) end;
end $$;

create or replace function public.rpc_schedule_meeting(p_family_id uuid,p_scheduled_at timestamptz,p_type text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.meetings%rowtype; f public.families%rowtype;
begin
 perform public.require_session();
 if not(public.staff_family_access(p_family_id) and public.has_permission('families.edit')) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 select * into f from public.families where id=p_family_id for update;
 if p_scheduled_at is null or p_type not in ('inperson','phone','video','zoom') then raise exception 'VALIDATION: meeting'; end if;
 if exists(select 1 from public.meetings where family_id=f.id and status in ('scheduled','in_progress')) then raise exception 'INVALID_STATE: active meeting exists'; end if;
 if not exists(select 1 from public.family_services where family_id=f.id and status='approved_analysis') then raise exception 'INVALID_STATE: no approved analysis'; end if;
 insert into public.meetings(family_id,representative_id,scheduled_at,type) values(f.id,f.representative_id,p_scheduled_at,p_type) returning * into m;
 insert into public.meeting_items(meeting_id,family_id,family_service_id,service_id,analysis_task_id,title,icon,result_tone,client_summary,current_situation,recommendation,financial,actions,client_decision)
 select m.id,f.id,s.id,s.service_id,t.id,svc.name,svc.icon,t.result_tone,t.client_summary,t.current_situation,t.recommendation,t.financial,t.actions,'undecided'
 from public.family_services s join public.analysis_tasks t on t.id=s.analysis_task_id join public.services svc on svc.id=s.service_id
 where s.family_id=f.id and s.status='approved_analysis';
 update public.families set status='meeting_set' where id=f.id;
 perform public.write_audit('create','meeting',m.id,f.name,'Meeting scheduled');
 return to_jsonb(m);
end $$;

create or replace function public.rpc_meeting_action(p_meeting_id uuid,p_action text,p_payload jsonb default '{}')
returns void language plpgsql security definer set search_path=public as $$
declare m public.meetings%rowtype;
begin
 perform public.require_session();
 select * into m from public.meetings where id=p_meeting_id for update;
 if m.id is null or not(public.staff_family_access(m.family_id) and public.has_permission('families.edit')) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if m.status not in ('scheduled','in_progress') then raise exception 'INVALID_STATE: meeting closed'; end if;
 if p_action='start' and m.status='scheduled' then update public.meetings set status='in_progress',started_at=now() where id=m.id;
 elsif p_action='cancel' then
  if length(trim(coalesce(p_payload->>'reason','')))=0 then raise exception 'VALIDATION: reason'; end if;
  update public.meetings set status='cancelled',cancel_reason=p_payload->>'reason' where id=m.id;
 elsif p_action='reschedule' then update public.meetings set scheduled_at=(p_payload->>'scheduled_at')::timestamptz where id=m.id;
 elsif p_action='decision' and m.status='in_progress' then
  if coalesce(p_payload->>'client_decision','') not in ('progress','thinking','declined','no_action','undecided') or jsonb_typeof(coalesce(p_payload->'approved_actions','[]'))<>'array' then raise exception 'VALIDATION: decision'; end if;
  update public.meeting_items set client_decision=p_payload->>'client_decision',decision_note=p_payload->>'decision_note',
   approved_actions=coalesce(p_payload->'approved_actions','[]'),execution_instructions=p_payload->>'execution_instructions'
  where id=(p_payload->>'item_id')::uuid and meeting_id=m.id;
  if not found then raise exception 'NOT_FOUND: meeting item'; end if;
 else raise exception 'INVALID_STATE: meeting action'; end if;
 perform public.write_audit('update','meeting',m.id,'',p_action);
end $$;

create or replace function public.rpc_review_document(p_document_id uuid,p_approved boolean,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare d public.documents%rowtype;
begin
 perform public.require_session();
 select * into d from public.documents where id=p_document_id for update;
 if not(public.has_permission('documents.manage') and public.staff_family_access(d.family_id)) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if d.id is null or d.status<>'pending' then raise exception 'INVALID_STATE: pending document required'; end if;
 if not p_approved and length(trim(coalesce(p_reason,'')))=0 then raise exception 'VALIDATION: reason'; end if;
 update public.documents set status=case when p_approved then 'approved' else 'rejected' end,
 approved_at=case when p_approved then now() else null end,reject_reason=case when p_approved then null else p_reason end where id=d.id;
 perform public.write_audit('review','document',d.id,d.name,case when p_approved then 'approved' else 'rejected' end);
end $$;

create or replace function public.rpc_request_document(p_family_id uuid,p_type_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare dt public.document_types%rowtype; d public.documents%rowtype;
begin
 perform public.require_session();
 if not(public.has_permission('documents.manage') and public.staff_family_access(p_family_id)) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 select * into dt from public.document_types where id=p_type_id and active;
 if dt.id is null then raise exception 'VALIDATION: document type'; end if;
 insert into public.documents(family_id,document_type_id,key,name,type) values(p_family_id,dt.id,dt.key,dt.name,dt.type)
 on conflict(family_id,key) do update set name=excluded.name returning * into d;
 return to_jsonb(d);
end $$;

create or replace function public.rpc_save_analysis_draft(p_task_id uuid,p_payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare t public.analysis_tasks%rowtype;
begin
 perform public.require_session();
 select * into t from public.analysis_tasks where id=p_task_id for update;
 if t.professional_id is distinct from public.current_professional_id() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if t.status not in ('assigned','in_progress','returned') then raise exception 'INVALID_STATE'; end if;
 if jsonb_typeof(p_payload)<>'object' or length(p_payload::text)>100000 then raise exception 'VALIDATION'; end if;
 update public.analysis_tasks set current_situation=p_payload->>'current_situation',result_tone=nullif(p_payload->>'result_tone',''),
 recommendation=p_payload->>'recommendation',client_summary=p_payload->>'client_summary',internal_note=p_payload->>'internal_note',
 findings=coalesce(p_payload->'findings','[]'),actions=coalesce(p_payload->'actions','[]'),financial=coalesce(p_payload->'financial','{}'),
 status='in_progress',started_at=coalesce(started_at,now()) where id=t.id;
 update public.family_services set status='in_progress' where id=t.family_service_id;
end $$;

create or replace function public.rpc_return_analysis(p_family_service_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare s public.family_services%rowtype;
begin
 perform public.require_session();
 select * into s from public.family_services where id=p_family_service_id for update;
 if not(public.has_permission('analysis.approve') and public.staff_family_access(s.family_id)) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if s.status<>'analysis_received' or length(trim(coalesce(p_reason,'')))=0 then raise exception 'INVALID_STATE'; end if;
 update public.analysis_tasks set status='in_progress',return_history=return_history||jsonb_build_array(jsonb_build_object('at',now(),'reason',p_reason)) where id=s.analysis_task_id;
 update public.family_services set status='in_progress' where id=s.id;
 perform public.write_audit('return','analysis',s.analysis_task_id,'','Analysis returned');
end $$;

create or replace function public.rpc_mark_notifications_read()
returns void language plpgsql security definer set search_path=public as $$
begin update public.notifications set read_at=now() where profile_id=public.require_session() and read_at is null; end $$;
commit;
