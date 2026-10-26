begin;
-- Rule evaluation is conservative: unknown operators or missing operands never match.
create or replace function public.rule_matches(p_answers jsonb,p_rule jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare v jsonb:=p_answers->(p_rule->>'field'); target jsonb:=p_rule->'value';
begin
 if p_rule->>'op'='exists' then return v is not null and v not in ('null'::jsonb,'""'::jsonb,'[]'::jsonb); end if;
 if v is null or v='null'::jsonb then return false; end if;
 case p_rule->>'op'
 when 'equals' then return coalesce(v=target,false);
 when 'not_equals' then return coalesce(v<>target,false);
 when 'contains' then return case when jsonb_typeof(v)='array' then v @> jsonb_build_array(target) else false end;
 when 'gt' then return coalesce((v#>>'{}')::numeric>(target#>>'{}')::numeric,false);
 when 'lt' then return coalesce((v#>>'{}')::numeric<(target#>>'{}')::numeric,false);
 else return false;
 end case;
exception when invalid_text_representation then return false;
end $$;

create or replace function public.rpc_complete_onboarding(p_family_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare f public.families%rowtype; svc record; fld jsonb; req jsonb; dt public.document_types%rowtype;
begin
 perform public.require_session();
 select * into f from public.families where id=p_family_id for update;
 if not public.user_has_family_access(f.id) or public.current_role_name() not in ('admin','representative','client') then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if f.onboarding_pct=100 then return; end if;
 perform public.validate_onboarding(f.answers);
 if coalesce(trim(f.contact_name),'')='' or coalesce(trim(f.phone),'')='' then raise exception 'VALIDATION: contact name and phone required'; end if;
 for svc in select * from public.services s where active and not exists(select 1 from jsonb_array_elements(s.trigger_conditions) c where not public.rule_matches(f.answers,c)) loop
  for fld in select * from jsonb_array_elements(svc.client_fields) loop
   if coalesce((fld->>'required')::boolean,false) and (fld->'show_when' is null or fld->'show_when'='null' or public.rule_matches(f.answers,fld->'show_when'))
    and (f.answers->(fld->>'key') is null or f.answers->(fld->>'key') in ('null','""','[]')) then raise exception 'VALIDATION: required field %',fld->>'key'; end if;
  end loop;
  insert into public.family_services(family_id,service_id) values(f.id,svc.id) on conflict do nothing;
  for req in select * from jsonb_array_elements(svc.required_documents) loop
   select * into dt from public.document_types where key=req->>'doc_key' and active;
   if dt.id is not null then
    insert into public.documents(family_id,document_type_id,service_id,key,name,type) values(f.id,dt.id,svc.id,dt.key,dt.name,dt.type) on conflict do nothing;
   end if;
  end loop;
 end loop;
 update public.families set onboarding_pct=100,status='waiting_docs' where id=f.id;
 perform public.write_audit('complete','onboarding',f.id,f.name,'Onboarding completed');
end $$;

create or replace function public.rpc_share_document(p_document_id uuid,p_task_id uuid,p_kind text,p_revoke boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare doc public.documents%rowtype; fam uuid;
begin
 perform public.require_session();
 select * into doc from public.documents where id=p_document_id;
 if p_kind='analysis' then select family_id into fam from public.analysis_tasks where id=p_task_id;
 elsif p_kind='execution' then select family_id into fam from public.execution_tasks where id=p_task_id;
 else raise exception 'VALIDATION: task kind'; end if;
 if fam is null or doc.family_id is distinct from fam or not(public.staff_family_access(fam) and public.has_permission('documents.manage')) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if not p_revoke and doc.status not in ('approved','signed') then raise exception 'INVALID_STATE: approved document required'; end if;
 if p_revoke then update public.task_documents set revoked_at=now() where document_id=doc.id and (analysis_task_id=p_task_id or execution_task_id=p_task_id);
 elsif p_kind='analysis' then
  insert into public.task_documents(document_id,analysis_task_id,shared_by) values(doc.id,p_task_id,public.current_profile_id())
  on conflict(document_id,analysis_task_id) where analysis_task_id is not null do update set revoked_at=null,shared_at=now();
 else
  insert into public.task_documents(document_id,execution_task_id,shared_by) values(doc.id,p_task_id,public.current_profile_id())
  on conflict(document_id,execution_task_id) where execution_task_id is not null do update set revoked_at=null,shared_at=now();
 end if;
 perform public.write_audit('share','document',doc.id,doc.name,case when p_revoke then 'revoked' else 'shared' end);
end $$;

-- Enforce cross-family sharing even inside another SECURITY DEFINER routine.
create or replace function public.guard_document_share()
returns trigger language plpgsql security definer set search_path=public as $$
declare fam uuid; docfam uuid;
begin
 select family_id into docfam from public.documents where id=new.document_id;
 if new.analysis_task_id is not null then select family_id into fam from public.analysis_tasks where id=new.analysis_task_id;
 else select family_id into fam from public.execution_tasks where id=new.execution_task_id; end if;
 if fam is null or docfam is distinct from fam then raise exception 'PERMISSION_DENIED: cross-family document' using errcode='42501'; end if;
 return new;
end $$;
create trigger guard_document_share before insert or update on public.task_documents for each row execute function public.guard_document_share();

create or replace function public.capture_analysis_snapshot()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 select coalesce(jsonb_agg(jsonb_build_object('label',fld->>'label','key',fld->>'key','value',f.answers->(fld->>'key'))),'[]')
 into new.snapshot from public.families f join public.services s on s.id=new.service_id,
 lateral jsonb_array_elements(s.professional_fields) fld where f.id=new.family_id;
 return new;
end $$;
create trigger capture_analysis_snapshot before insert on public.analysis_tasks for each row execute function public.capture_analysis_snapshot();

create or replace function public.rpc_execution_note(p_task_id uuid,p_action text,p_text text,p_follow_up timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare t public.execution_tasks%rowtype; profile public.profiles%rowtype; new_status text;
begin
 select * into profile from public.profiles where id=public.require_session();
 select * into t from public.execution_tasks where id=p_task_id for update;
 if t.id is null or (public.staff_family_access(t.family_id) or t.professional_id=public.current_professional_id()) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if t.status in ('completed','not_completed','cancelled','reassigned') then raise exception 'INVALID_STATE: task closed'; end if;
 if length(trim(coalesce(p_text,''))) not between 1 and 5000 then raise exception 'VALIDATION: text'; end if;
 if p_action='message' then
  insert into public.execution_messages(execution_task_id,sender_profile_id,sender_role,body) values(t.id,profile.id,profile.role,p_text);
 elsif p_action='note' then
  insert into public.execution_updates(execution_task_id,author_profile_id,author_name,kind,text) values(t.id,profile.id,profile.name,'progress',p_text);
 elsif p_action in ('wait','needs_info','resume') then
  if t.professional_id is distinct from public.current_professional_id() and not public.has_permission('execution.approve') then raise exception 'PERMISSION_DENIED'; end if;
  if t.status not in ('execution_in_progress','waiting_client','needs_info') then raise exception 'INVALID_STATE'; end if;
  new_status:=case p_action when 'wait' then 'waiting_client' when 'needs_info' then 'needs_info' else 'execution_in_progress' end;
  update public.execution_tasks set status=new_status,waiting_reason=p_text,waiting_follow_up_at=p_follow_up where id=t.id;
  update public.family_services set status=case when new_status='needs_info' then 'execution_needs_info' else new_status end where id=t.family_service_id;
 else raise exception 'VALIDATION: action'; end if;
 perform public.write_audit('update','execution',t.id,t.task_number,p_action);
end $$;

create or replace function public.rpc_execution_history(p_task_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare t public.execution_tasks%rowtype;
begin
 perform public.require_session();
 select * into t from public.execution_tasks where id=p_task_id;
 if t.id is null or (public.staff_family_access(t.family_id) or t.professional_id=public.current_professional_id()) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 return jsonb_build_object('updates',coalesce((select jsonb_agg(to_jsonb(x) order by created_at) from public.execution_updates x where execution_task_id=t.id),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(x) order by created_at) from public.execution_messages x where execution_task_id=t.id),'[]'));
end $$;

create or replace function public.rpc_sign_document(p_document_id uuid,p_signer text,p_consent boolean,p_text text)
returns void language plpgsql security definer set search_path=public as $$
declare d public.documents%rowtype; consent_text text;
begin
 perform public.require_session();
 select * into d from public.documents where id=p_document_id for update;
 select description into consent_text from public.document_types where id=d.document_type_id and active;
 if not exists(select 1 from public.families where id=d.family_id and client_profile_id=public.current_profile_id()) then raise exception 'PERMISSION_DENIED'; end if;
 if d.type<>'signature' or p_consent is distinct from true or length(trim(coalesce(p_signer,'')))<2 then raise exception 'VALIDATION: explicit consent required'; end if;
 if length(trim(coalesce(consent_text,'')))<20 or consent_text is distinct from p_text then raise exception 'VALIDATION: consent text missing or changed'; end if;
 if d.status='signed' then return; end if;
 update public.documents set status='signed',uploaded_at=now(),file_name='הסכמה מתועדת: '||left(p_signer,150) where id=d.id;
 perform public.write_audit('consent','document',d.id,d.name,'Explicit recorded consent',jsonb_build_object('signer',left(p_signer,150),'at',now(),'text',consent_text));
end $$;
commit;
