begin;
-- Private allocation helpers preserve the existing task lifecycle. Only claim RPC can call them.
create or replace function f360.allocate_pool_analysis(
  p_family_service_id uuid,
  p_professional_id   uuid,
  p_note              text default null)
returns public.analysis_tasks
language plpgsql security definer set search_path = public as $$
declare
  fs   public.family_services%rowtype;
  fam  public.families%rowtype;
  svc  public.services%rowtype;
  t    public.analysis_tasks%rowtype;
  pro_profile uuid;
  sla  integer;
  num  text;
begin


  select * into fs from public.family_services where id = p_family_service_id for update;
  if not found then raise exception 'NOT_FOUND: family_service' using errcode = 'P0002'; end if;



  -- Guard 1: רק תחום שממתין לניתוח (או שהוחזר)
  if fs.status not in ('waiting_analysis','returned') then
    raise exception 'INVALID_STATE: service is % and cannot be sent to analysis', fs.status
      using errcode = 'P0001';
  end if;

  -- Guard 2: בעל מקצוע פעיל, משויך לתחום ומורשה ניתוח
  if not f360.pool_candidate_eligible(p_professional_id, fs.service_id, 'analysis') then
    raise exception 'INELIGIBLE_PROFESSIONAL: not active/assigned/analysis-enabled'
      using errcode = 'P0001';
  end if;

  select * into fam from public.families where id = fs.family_id;
  select * into svc from public.services where id = fs.service_id;

  sla := public.resolve_sla_hours(fs.service_id, p_professional_id, 'analysis');
  num := public.next_task_number('analysis_task');

  insert into public.analysis_tasks(
    task_number, family_id, family_service_id, service_id, professional_id,
    representative_id, status, due_at, assigned_at, rep_note, snapshot)
  values (num, fs.family_id, fs.id, fs.service_id, p_professional_id,
          fam.representative_id, 'assigned', now() + (sla || ' hours')::interval,
          now(), p_note, '[]'::jsonb)
  returning * into t;

  update public.family_services
     set status = 'assigned', professional_id = p_professional_id,
         analysis_task_id = t.id, sent_at = now()
   where id = fs.id;

  insert into public.timeline_events(family_id, event_type, title, description, actor_profile_id)
  values (fs.family_id, 'analysis_sent',
          svc.name || ' נשלח לניתוח · ' || num, p_note, public.current_profile_id());

  select profile_id into pro_profile from public.professionals where id = p_professional_id;
  insert into public.notifications(profile_id, family_id, title, body, type)
  values (pro_profile, fs.family_id, 'תיק חדש לניתוח — ' || svc.name,
          fam.name || ' · ' || num, 'analysis_assigned');

  return t;
end;
$$;
create or replace function f360.allocate_pool_execution(
  p_family_service_id uuid,
  p_professional_id   uuid,
  p_document_ids      uuid[] default '{}',
  p_rep_note          text default null)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare
  fs public.family_services%rowtype; fam public.families%rowtype;
  svc public.services%rowtype; mi public.meeting_items%rowtype;
  e public.execution_tasks%rowtype;
  sla integer; num text; pro_profile uuid; d uuid;
begin

  select * into fs from public.family_services where id = p_family_service_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;


  -- Guard 1: רק תחום שהלקוח אישר בפגישה
  if fs.status <> 'client_approved_execution' then
    raise exception 'INVALID_STATE: execution requires client approval (service is %)', fs.status
      using errcode = 'P0001'; end if;
  -- Guard 2: כשירות בעל מקצוע לביצוע (ייתכן שונה ממי שביצע את הניתוח)
  if not f360.pool_candidate_eligible(p_professional_id, fs.service_id, 'execution') then
    raise exception 'INELIGIBLE_PROFESSIONAL: not active/assigned/execution-enabled'
      using errcode = 'P0001'; end if;

  select * into fam from public.families where id = fs.family_id;
  select * into svc from public.services where id = fs.service_id;
  -- שרשרת העקיבות: פריט הפגישה שבו התקבלה ההחלטה
  select * into mi from public.meeting_items
   where family_service_id = fs.id and client_decision = 'progress' and exists(select 1 from public.meetings m where m.id=meeting_id and m.status='completed')
   order by updated_at desc limit 1;

  sla := public.resolve_sla_hours(fs.service_id, p_professional_id, 'execution');
  if coalesce(mi.urgency,'normal') = 'high' then sla := greatest(1, sla / 2); end if;
  num := public.next_task_number('execution_task');

  insert into public.execution_tasks(
    task_number, family_id, family_service_id, service_id, professional_id, representative_id,
    source_meeting_id, source_meeting_item_id, analysis_task_id, status, due_at, sent_at,
    client_name, client_phone, client_email, client_decision_at,
    instructions, approved_actions, urgency, contact_window, representative_note, snapshot)
  values (num, fs.family_id, fs.id, fs.service_id, p_professional_id, fam.representative_id,
          mi.meeting_id, mi.id, fs.analysis_task_id, 'sent_execution',
          now() + (sla || ' hours')::interval, now(),
          fam.name, fam.phone, fam.email, mi.updated_at,
          mi.execution_instructions, coalesce(mi.approved_actions,'[]'::jsonb),
          coalesce(mi.urgency,'normal'), mi.contact_window, p_rep_note, '[]'::jsonb)
  returning * into e;

  update public.family_services
     set status = 'sent_execution', professional_id = p_professional_id,
         execution_task_id = e.id, sent_at = now()
   where id = fs.id;

  -- שיוך מסמכים מפורש — זו ההרשאה היחידה של בעל המקצוע לקבצים
  foreach d in array coalesce(p_document_ids, '{}') loop
    insert into public.task_documents(document_id, execution_task_id, shared_by)
    values (d, e.id, public.current_profile_id())
    on conflict do nothing;
  end loop;

  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (fs.family_id, 'execution_sent',
          'התחום ' || svc.name || ' הועבר לביצוע · ' || num, public.current_profile_id());

  select profile_id into pro_profile from public.professionals where id = p_professional_id;
  insert into public.notifications(profile_id, family_id, title, body, type)
  values (pro_profile, fs.family_id, 'ליד חדש לביצוע — ' || svc.name,
          fam.name || ' · ' || num, 'execution_assigned');
  return e;
end;
$$;
create function f360.pool_candidate_eligible(pro_id uuid,svc_id uuid,mode text) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_professional_eligible(pro_id,svc_id,mode) and exists(select 1 from public.professionals pr join public.profiles p on p.id=pr.profile_id where pr.id=pro_id and p.active and p.role='professional')
$$;
create table f360.professional_offers(
 id uuid primary key,family_service_id uuid not null references public.family_services(id),
 kind text not null check(kind in ('analysis','execution')),candidates uuid[] not null,note text not null default '',
 source_analysis_task_id uuid,source_execution_task_id uuid,
 created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '48 hours',
 status text not null default 'open' check(status in ('open','claimed','cancelled')),claimed_by uuid references public.professionals(id),task_id uuid
);
create unique index on f360.professional_offers(family_service_id) where status='open';
alter table f360.professional_offers enable row level security;
revoke all on f360.professional_offers from public,anon,authenticated;
create function f360.offer_authorized(o f360.professional_offers) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles p join public.family_services fs on fs.id=o.family_service_id join public.families f on f.id=fs.family_id
 left join public.representatives r on r.profile_id=p.id where p.id=o.created_by and p.active
 and f.status not in ('archived','completed') and fs.status=case when o.kind='analysis' then 'waiting_analysis' else 'client_approved_execution' end
 and fs.analysis_task_id is not distinct from o.source_analysis_task_id and fs.execution_task_id is not distinct from o.source_execution_task_id
 and (p.role='admin' or (p.role='representative' and r.active and r.permissions ? (o.kind||'.send') and (r.id=f.representative_id or r.permissions ? 'families.view_all')))
 and (o.kind='analysis' or exists(select 1 from public.meeting_items i join public.meetings m on m.id=i.meeting_id where i.family_service_id=fs.id and i.client_decision='progress' and m.status='completed')))
$$;
create function public.rpc_create_professional_offer(p_id uuid,p_family_service_id uuid,p_kind text,p_candidates uuid[],p_note text default '') returns void language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session();fs public.family_services%rowtype;old f360.professional_offers%rowtype;c uuid;
begin
 select * into fs from public.family_services where id=p_family_service_id for update;
 if fs.id is null or (public.staff_family_access(fs.family_id) and public.has_permission(p_kind||'.send')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 if p_id is null or p_kind is null or p_kind not in ('analysis','execution') or coalesce(cardinality(p_candidates),0) not between 2 and 3 or array_ndims(p_candidates)<>1
 or (select count(distinct x) from unnest(p_candidates)x)<>cardinality(p_candidates) or p_note is null or length(p_note)>5000 then raise exception 'VALIDATION';end if;
 foreach c in array p_candidates loop if f360.pool_candidate_eligible(c,fs.service_id,p_kind) is not true then raise exception 'INELIGIBLE_PROFESSIONAL';end if;end loop;
 select * into old from f360.professional_offers where id=p_id;
 if old.id is not null then
  if old.family_service_id=fs.id and old.created_by=pid and old.kind=p_kind and old.candidates=p_candidates and old.note=p_note then return;end if;
  raise exception 'CONFLICT';
 end if;
 update f360.professional_offers o set status='cancelled' where o.family_service_id=fs.id and o.status='open' and (o.expires_at<=now() or not f360.offer_authorized(o));
 if exists(select 1 from f360.professional_offers where family_service_id=fs.id and status='open') then raise exception 'CONFLICT';end if;
 insert into f360.professional_offers(id,family_service_id,kind,candidates,note,created_by,source_analysis_task_id,source_execution_task_id) values(p_id,fs.id,p_kind,p_candidates,p_note,pid,fs.analysis_task_id,fs.execution_task_id) returning * into old;
 if f360.offer_authorized(old) is not true then raise exception 'INVALID_STATE';end if;
 perform public.write_audit('create','professional_offer',p_id,'','Professional pool offer created',jsonb_build_object('family_id',fs.family_id,'kind',p_kind));
end $$;
create function public.rpc_cancel_professional_offer(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare o f360.professional_offers%rowtype;fs public.family_services%rowtype;
begin
 perform public.require_session();
 select * into fs from public.family_services where id=(select family_service_id from f360.professional_offers where id=p_id) for update;
 select * into o from f360.professional_offers where id=p_id for update;
 if o.id is null or (public.staff_family_access(fs.family_id) and public.has_permission(o.kind||'.send')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 if o.status='claimed' then raise exception 'CONFLICT';end if;
 update f360.professional_offers set status='cancelled' where id=p_id;
 perform public.write_audit('cancel','professional_offer',p_id,'','Professional pool offer cancelled');
end $$;
create function public.rpc_claim_professional_offer(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare pro uuid;fs public.family_services%rowtype;o f360.professional_offers%rowtype;task uuid;
begin
 perform public.require_session();pro:=public.current_professional_id();
 select * into fs from public.family_services where id=(select family_service_id from f360.professional_offers where id=p_id) for update;
 select * into o from f360.professional_offers where id=p_id for update;
 if o.id is null or pro is null or (pro=any(o.candidates)) is not true or public.current_role_name()<>'professional'
 or f360.pool_candidate_eligible(pro,fs.service_id,o.kind) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 if o.status='claimed' and o.claimed_by=pro then return jsonb_build_object('id',o.task_id,'kind',o.kind);end if;
 if o.status<>'open' or o.expires_at<=now() or f360.offer_authorized(o) is not true then raise exception 'CONFLICT';end if;
 if o.kind='analysis' then select id into task from f360.allocate_pool_analysis(fs.id,pro,o.note);
 else select id into task from f360.allocate_pool_execution(fs.id,pro,'{}',o.note);end if;
 update f360.professional_offers set status='claimed',claimed_by=pro,task_id=task where id=p_id;
 perform public.write_audit('claim','professional_offer',p_id,'','Professional pool offer claimed',jsonb_build_object('task_id',task));
 return jsonb_build_object('id',task,'kind',o.kind);
end $$;
create function public.rpc_list_professional_offers(p_family_service_id uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare pro uuid;staff boolean;
begin
 perform public.require_session();pro:=public.current_professional_id();staff:=public.current_role_name() in ('admin','representative');
 if not staff and public.current_role_name()<>'professional' then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 return coalesce((select jsonb_agg(row_data order by created_at desc,id desc) from (
 select o.id,o.created_at,jsonb_build_object('id',o.id,'kind',o.kind,'service_name',s.name,'created_at',o.created_at,'expires_at',o.expires_at,
 'status',case when o.status='open' and (o.expires_at<=now() or not f360.offer_authorized(o)) then 'expired' else o.status end)
 ||case when staff then jsonb_build_object('family_service_id',fs.id,'candidates',o.candidates,'claimed_by',o.claimed_by) else '{}'::jsonb end row_data
 from f360.professional_offers o join public.family_services fs on fs.id=o.family_service_id join public.services s on s.id=fs.service_id
 where (p_family_service_id is null or fs.id=p_family_service_id) and
 ((staff and public.staff_family_access(fs.family_id)) or (not staff and pro=any(o.candidates) and o.status='open' and o.expires_at>now() and f360.offer_authorized(o) and f360.pool_candidate_eligible(pro,fs.service_id,o.kind)))
 order by o.created_at desc,o.id desc limit 100
 ) rows),'[]');
end $$;
revoke all on function f360.pool_candidate_eligible(uuid,uuid,text),f360.allocate_pool_analysis(uuid,uuid,text),f360.allocate_pool_execution(uuid,uuid,uuid[],text),f360.offer_authorized(f360.professional_offers) from public,anon,authenticated;
revoke all on function public.rpc_create_professional_offer(uuid,uuid,text,uuid[],text),public.rpc_cancel_professional_offer(uuid),public.rpc_claim_professional_offer(uuid),public.rpc_list_professional_offers(uuid) from public,anon,authenticated;
grant execute on function public.rpc_create_professional_offer(uuid,uuid,text,uuid[],text),public.rpc_cancel_professional_offer(uuid),public.rpc_claim_professional_offer(uuid),public.rpc_list_professional_offers(uuid) to authenticated;
create or replace function public.rpc_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin return f360.rpc_workspace_directory()||jsonb_build_object('resourceLibraryEnabled',true,'professionalPoolEnabled',true);end $$;
commit;
