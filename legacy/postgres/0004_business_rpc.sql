-- ============================================================================
-- 0004_business_rpc.sql — Business Mutations
-- כל פונקציה כאן היא טרנזקציה אחת: או שהכול נכתב, או ששום דבר לא.
-- ה-Guards הם תרגום ישיר של אלה שהוספתי ל-API ב-v8, וכעת הם בלתי-עקיפים:
-- גם פנייה ישירה ל-Supabase מהדפדפן חייבת לעבור דרכם.
-- ============================================================================

-- --------------------------------------------------------- שליחה לניתוח
create or replace function public.rpc_send_to_analysis(
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
  if not public.has_permission('analysis.send') then
    raise exception 'PERMISSION_DENIED: analysis.send' using errcode = '42501';
  end if;

  select * into fs from public.family_services where id = p_family_service_id for update;
  if not found then raise exception 'NOT_FOUND: family_service' using errcode = 'P0002'; end if;

  if not public.user_has_family_access(fs.family_id) then
    raise exception 'PERMISSION_DENIED: family access' using errcode = '42501';
  end if;

  -- Guard 1: רק תחום שממתין לניתוח (או שהוחזר)
  if fs.status not in ('waiting_analysis','returned') then
    raise exception 'INVALID_STATE: service is % and cannot be sent to analysis', fs.status
      using errcode = 'P0001';
  end if;

  -- Guard 2: בעל מקצוע פעיל, משויך לתחום ומורשה ניתוח
  if not public.is_professional_eligible(p_professional_id, fs.service_id, 'analysis') then
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

-- --------------------------------------------------------- הגשת ניתוח
create or replace function public.rpc_submit_analysis(
  p_task_id uuid, p_payload jsonb)
returns public.analysis_tasks
language plpgsql security definer set search_path = public as $$
declare t public.analysis_tasks%rowtype; svc public.services%rowtype; rep_profile uuid;
begin
  select * into t from public.analysis_tasks where id = p_task_id for update;
  if not found then raise exception 'NOT_FOUND: task' using errcode = 'P0002'; end if;

  -- Guard: רק בעל המקצוע של המשימה
  if t.professional_id is distinct from public.current_professional_id() then
    raise exception 'PERMISSION_DENIED: not task owner' using errcode = '42501';
  end if;
  if t.status not in ('assigned','in_progress') then
    raise exception 'INVALID_STATE: task is %', t.status using errcode = 'P0001';
  end if;
  -- Guard: שדות חובה של תוצאת הניתוח
  if coalesce(p_payload ->> 'current_situation','') = ''
     or coalesce(p_payload ->> 'result_tone','') = ''
     or coalesce(p_payload ->> 'recommendation','') = ''
     or coalesce(p_payload ->> 'client_summary','') = '' then
    raise exception 'VALIDATION: missing required analysis fields' using errcode = 'P0001';
  end if;

  update public.analysis_tasks set
    current_situation = p_payload ->> 'current_situation',
    result_tone       = p_payload ->> 'result_tone',
    recommendation    = p_payload ->> 'recommendation',
    client_summary    = p_payload ->> 'client_summary',
    internal_note     = p_payload ->> 'internal_note',
    findings          = coalesce(p_payload -> 'findings', '[]'::jsonb),
    actions           = coalesce(p_payload -> 'actions', '[]'::jsonb),
    financial         = coalesce(p_payload -> 'financial', '{}'::jsonb),
    result_values     = coalesce(p_payload -> 'result_values', '{}'::jsonb),
    attachments       = coalesce(p_payload -> 'attachments', '[]'::jsonb),
    status = 'submitted', completed_at = now()
  where id = p_task_id returning * into t;

  update public.family_services
     set status = 'analysis_received', result_tone = t.result_tone, completed_at = now()
   where id = t.family_service_id;

  select * into svc from public.services where id = t.service_id;
  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (t.family_id, 'analysis_received',
          'התקבל ניתוח ' || svc.name || ' · ' || t.task_number, public.current_profile_id());

  select r.profile_id into rep_profile from public.families f
    join public.representatives r on r.id = f.representative_id where f.id = t.family_id;
  if rep_profile is not null then
    insert into public.notifications(profile_id, family_id, title, body, type)
    values (rep_profile, t.family_id, 'התקבל ניתוח חדש', svc.name, 'analysis_received');
  end if;
  return t;
end;
$$;

-- --------------------------------------------------------- אישור ניתוח
create or replace function public.rpc_approve_analysis(p_family_service_id uuid)
returns public.family_services
language plpgsql security definer set search_path = public as $$
declare fs public.family_services%rowtype; svc public.services%rowtype;
begin
  if not public.has_permission('analysis.approve') then
    raise exception 'PERMISSION_DENIED: analysis.approve' using errcode = '42501'; end if;
  select * into fs from public.family_services where id = p_family_service_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.user_has_family_access(fs.family_id) then
    raise exception 'PERMISSION_DENIED: family access' using errcode = '42501'; end if;
  -- Guard: רק ניתוח שהתקבל בפועל ניתן לאישור
  if fs.status <> 'analysis_received' then
    raise exception 'INVALID_STATE: service is %', fs.status using errcode = 'P0001'; end if;

  update public.family_services set status = 'approved_analysis' where id = fs.id returning * into fs;
  update public.analysis_tasks set status = 'approved' where id = fs.analysis_task_id;
  select * into svc from public.services where id = fs.service_id;
  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (fs.family_id, 'analysis_approved', 'הניתוח אושר · ' || svc.name, public.current_profile_id());
  return fs;
end;
$$;

-- --------------------------------------------------------- שליחה לביצוע
create or replace function public.rpc_send_to_execution(
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
  if not public.has_permission('execution.send') then
    raise exception 'PERMISSION_DENIED: execution.send' using errcode = '42501'; end if;
  select * into fs from public.family_services where id = p_family_service_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.user_has_family_access(fs.family_id) then
    raise exception 'PERMISSION_DENIED: family access' using errcode = '42501'; end if;

  -- Guard 1: רק תחום שהלקוח אישר בפגישה
  if fs.status <> 'client_approved_execution' then
    raise exception 'INVALID_STATE: execution requires client approval (service is %)', fs.status
      using errcode = 'P0001'; end if;
  -- Guard 2: כשירות בעל מקצוע לביצוע (ייתכן שונה ממי שביצע את הניתוח)
  if not public.is_professional_eligible(p_professional_id, fs.service_id, 'execution') then
    raise exception 'INELIGIBLE_PROFESSIONAL: not active/assigned/execution-enabled'
      using errcode = 'P0001'; end if;

  select * into fam from public.families where id = fs.family_id;
  select * into svc from public.services where id = fs.service_id;
  -- שרשרת העקיבות: פריט הפגישה שבו התקבלה ההחלטה
  select * into mi from public.meeting_items
   where family_service_id = fs.id and client_decision = 'progress'
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

-- --------------------------------------------------------- התחלת טיפול
create or replace function public.rpc_start_execution(p_task_id uuid)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare e public.execution_tasks%rowtype; svc public.services%rowtype;
begin
  select * into e from public.execution_tasks where id = p_task_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if e.professional_id is distinct from public.current_professional_id() then
    raise exception 'PERMISSION_DENIED: not task owner' using errcode = '42501'; end if;
  if e.status <> 'sent_execution' then
    raise exception 'INVALID_STATE: task is %', e.status using errcode = 'P0001'; end if;

  update public.execution_tasks
     set status='execution_in_progress', started_at=now(),
         opened_at=coalesce(opened_at, now())
   where id=p_task_id returning * into e;
  update public.family_services set status='execution_in_progress' where id=e.family_service_id;
  select * into svc from public.services where id=e.service_id;
  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (e.family_id,'execution_started','בעל המקצוע התחיל טיפול בתחום '||svc.name,
          public.current_profile_id());
  return e;
end;
$$;

-- --------------------------------------------------------- דיווח סיום
create or replace function public.rpc_report_execution_complete(
  p_task_id uuid, p_outcome text, p_summary text default null,
  p_result text default null, p_note text default null, p_value numeric default null)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare e public.execution_tasks%rowtype; svc public.services%rowtype; rep_profile uuid;
begin
  select * into e from public.execution_tasks where id = p_task_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if e.professional_id is distinct from public.current_professional_id() then
    raise exception 'PERMISSION_DENIED: not task owner' using errcode = '42501'; end if;
  if e.status not in ('execution_in_progress','waiting_client','needs_info') then
    raise exception 'INVALID_STATE: task is %', e.status using errcode = 'P0001'; end if;
  -- Guard: Outcome חובה
  if coalesce(p_outcome,'') = '' then
    raise exception 'VALIDATION: outcome is required' using errcode = 'P0001'; end if;

  update public.execution_tasks
     set status='execution_reported_complete', reported_at=now(),
         outcome=p_outcome, outcome_summary=p_summary, outcome_result=p_result,
         outcome_note=p_note, outcome_value=p_value
   where id=p_task_id returning * into e;
  update public.family_services set status='execution_reported_complete' where id=e.family_service_id;

  select * into svc from public.services where id=e.service_id;
  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (e.family_id,'execution_reported','הביצוע דווח כהושלם · '||svc.name, public.current_profile_id());
  select r.profile_id into rep_profile from public.families f
    join public.representatives r on r.id=f.representative_id where f.id=e.family_id;
  if rep_profile is not null then
    insert into public.notifications(profile_id, family_id, title, body, type)
    values (rep_profile, e.family_id, 'הביצוע דווח כהושלם', svc.name, 'execution_reported');
  end if;
  return e;
end;
$$;

-- --------------------------------------------------------- אישור סיום ע"י הנציג
create or replace function public.rpc_approve_execution(p_task_id uuid)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare e public.execution_tasks%rowtype; svc public.services%rowtype;
begin
  if not public.has_permission('execution.approve') then
    raise exception 'PERMISSION_DENIED: execution.approve' using errcode = '42501'; end if;
  select * into e from public.execution_tasks where id = p_task_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.user_has_family_access(e.family_id) then
    raise exception 'PERMISSION_DENIED: family access' using errcode = '42501'; end if;
  -- Guard מרכזי: אין completed בלי דיווח קודם של בעל המקצוע
  if e.status <> 'execution_reported_complete' then
    raise exception 'INVALID_STATE: cannot complete before it is reported (task is %)', e.status
      using errcode = 'P0001'; end if;

  update public.execution_tasks set status='completed', completed_at=now()
   where id=p_task_id returning * into e;
  update public.family_services set status='completed', completed_at=now()
   where id=e.family_service_id;
  select * into svc from public.services where id=e.service_id;
  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (e.family_id,'execution_completed','ביצוע '||svc.name||' הושלם ואושר', public.current_profile_id());
  return e;
end;
$$;

-- --------------------------------------------------------- החזרה לטיפול
create or replace function public.rpc_return_execution(p_task_id uuid, p_reason text)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare e public.execution_tasks%rowtype; pro_profile uuid;
begin
  if not public.has_permission('execution.approve') then
    raise exception 'PERMISSION_DENIED' using errcode = '42501'; end if;
  if coalesce(trim(p_reason),'') = '' then
    raise exception 'VALIDATION: reason is required' using errcode = 'P0001'; end if;
  select * into e from public.execution_tasks where id=p_task_id for update;
  if e.status <> 'execution_reported_complete' then
    raise exception 'INVALID_STATE: task is %', e.status using errcode = 'P0001'; end if;

  update public.execution_tasks
     set status='execution_in_progress', reported_at=null,
         return_history = return_history || jsonb_build_object(
           'at', now(), 'reason', p_reason, 'by', public.current_profile_id())
   where id=p_task_id returning * into e;
  update public.family_services set status='execution_in_progress' where id=e.family_service_id;
  insert into public.timeline_events(family_id, event_type, title, description, actor_profile_id)
  values (e.family_id,'execution_returned','הביצוע הוחזר לטיפול', p_reason, public.current_profile_id());
  select profile_id into pro_profile from public.professionals where id=e.professional_id;
  insert into public.notifications(profile_id, family_id, title, body, type)
  values (pro_profile, e.family_id, 'המשימה הוחזרה לטיפול', p_reason, 'execution_returned');
  return e;
end;
$$;

-- --------------------------------------------------------- סגירה ללא ביצוע
create or replace function public.rpc_close_not_completed(
  p_task_id uuid, p_reason text, p_note text)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare e public.execution_tasks%rowtype; rep_profile uuid;
begin
  select * into e from public.execution_tasks where id=p_task_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if e.professional_id is distinct from public.current_professional_id() then
    raise exception 'PERMISSION_DENIED: not task owner' using errcode='42501'; end if;
  if e.status not in ('sent_execution','execution_in_progress','waiting_client','needs_info') then
    raise exception 'INVALID_STATE: task is %', e.status using errcode='P0001'; end if;
  -- Guard: סיבה והערת סיכום — שתיהן חובה
  if coalesce(trim(p_reason),'')='' or coalesce(trim(p_note),'')='' then
    raise exception 'VALIDATION: reason and note are required' using errcode='P0001'; end if;

  update public.execution_tasks
     set status='not_completed', completed_at=now(), close_reason=p_reason, outcome_note=p_note
   where id=p_task_id returning * into e;
  update public.family_services set status='not_completed', completed_at=now()
   where id=e.family_service_id;
  insert into public.timeline_events(family_id, event_type, title, description, actor_profile_id)
  values (e.family_id,'execution_not_completed','הביצוע נסגר ללא ביצוע', p_reason, public.current_profile_id());
  select r.profile_id into rep_profile from public.families f
    join public.representatives r on r.id=f.representative_id where f.id=e.family_id;
  if rep_profile is not null then
    insert into public.notifications(profile_id, family_id, title, body, type)
    values (rep_profile, e.family_id, 'ביצוע נסגר ללא ביצוע', p_reason, 'execution_not_completed');
  end if;
  return e;
end;
$$;

-- --------------------------------------------------------- ביטול שליחה
create or replace function public.rpc_cancel_execution_send(p_task_id uuid, p_reason text)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare e public.execution_tasks%rowtype;
begin
  if not public.has_permission('execution.send') then
    raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if coalesce(trim(p_reason),'')='' then
    raise exception 'VALIDATION: reason is required' using errcode='P0001'; end if;
  select * into e from public.execution_tasks where id=p_task_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  -- Guard: ביטול רק לפני שהתחיל טיפול בפועל
  if e.started_at is not null or e.status <> 'sent_execution' then
    raise exception 'INVALID_STATE: cannot cancel after work started (task is %)', e.status
      using errcode='P0001'; end if;

  update public.execution_tasks set status='cancelled', cancel_reason=p_reason
   where id=p_task_id returning * into e;
  update public.family_services
     set status='client_approved_execution', execution_task_id=null, professional_id=null
   where id=e.family_service_id;
  insert into public.timeline_events(family_id, event_type, title, description, actor_profile_id)
  values (e.family_id,'execution_cancelled','בוטלה שליחה לביצוע', p_reason, public.current_profile_id());
  return e;
end;
$$;

-- --------------------------------------------------------- העברה לבעל מקצוע אחר
create or replace function public.rpc_reassign_execution(
  p_task_id uuid, p_new_professional_id uuid, p_reason text)
returns public.execution_tasks
language plpgsql security definer set search_path = public as $$
declare old_e public.execution_tasks%rowtype; new_e public.execution_tasks%rowtype;
        num text; sla integer; pro_profile uuid;
begin
  if not public.has_permission('execution.send') then
    raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if coalesce(trim(p_reason),'')='' then
    raise exception 'VALIDATION: reason is required' using errcode='P0001'; end if;
  select * into old_e from public.execution_tasks where id=p_task_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if old_e.status not in ('sent_execution','execution_in_progress','waiting_client','needs_info') then
    raise exception 'INVALID_STATE: task is %', old_e.status using errcode='P0001'; end if;
  if not public.is_professional_eligible(p_new_professional_id, old_e.service_id, 'execution') then
    raise exception 'INELIGIBLE_PROFESSIONAL' using errcode='P0001'; end if;

  -- הישנה נסגרת כ-reassigned ונשמרת במלואה (ההיסטוריה לא נמחקת)
  update public.execution_tasks
     set status='reassigned',
         reassignment_history = reassignment_history || jsonb_build_object(
           'at', now(), 'reason', p_reason, 'from', old_e.professional_id,
           'to', p_new_professional_id, 'by', public.current_profile_id())
   where id=p_task_id;

  sla := public.resolve_sla_hours(old_e.service_id, p_new_professional_id, 'execution');
  num := public.next_task_number('execution_task');
  insert into public.execution_tasks(
    task_number, family_id, family_service_id, service_id, professional_id, representative_id,
    source_meeting_id, source_meeting_item_id, analysis_task_id, prior_task_id, status, due_at,
    sent_at, client_name, client_phone, client_email, instructions, approved_actions,
    urgency, contact_window, representative_note, snapshot, reassignment_history)
  select num, old_e.family_id, old_e.family_service_id, old_e.service_id, p_new_professional_id,
         old_e.representative_id, old_e.source_meeting_id, old_e.source_meeting_item_id,
         old_e.analysis_task_id, old_e.id, 'sent_execution',
         now() + (sla || ' hours')::interval, now(), old_e.client_name, old_e.client_phone,
         old_e.client_email, old_e.instructions, old_e.approved_actions, old_e.urgency,
         old_e.contact_window, old_e.representative_note, old_e.snapshot,
         old_e.reassignment_history || jsonb_build_object('at', now(), 'reason', p_reason,
           'from', old_e.professional_id, 'to', p_new_professional_id)
  returning * into new_e;

  -- העדכונים הקודמים מועתקים כדי שההיסטוריה תישמר גם במשימה החדשה
  insert into public.execution_updates(execution_task_id, author_profile_id, author_name, kind, contact_result, text, created_at)
  select new_e.id, author_profile_id, author_name, kind, contact_result, text, created_at
    from public.execution_updates where execution_task_id = old_e.id;

  update public.family_services
     set execution_task_id=new_e.id, professional_id=p_new_professional_id, status='sent_execution'
   where id=old_e.family_service_id;
  insert into public.timeline_events(family_id, event_type, title, description, actor_profile_id)
  values (old_e.family_id,'execution_reassigned','הביצוע הועבר לבעל מקצוע אחר', p_reason,
          public.current_profile_id());
  select profile_id into pro_profile from public.professionals where id=p_new_professional_id;
  insert into public.notifications(profile_id, family_id, title, body, type)
  values (pro_profile, old_e.family_id, 'ליד חדש לביצוע', new_e.task_number, 'execution_assigned');
  return new_e;
end;
$$;

-- --------------------------------------------------------- סיום פגישה
-- אטומי: ההחלטות + סטטוסי התחומים + ה-Timeline נכתבים יחד.
create or replace function public.rpc_finish_meeting(p_meeting_id uuid, p_force boolean default false)
returns public.meetings
language plpgsql security definer set search_path = public as $$
declare m public.meetings%rowtype; undecided integer; it record;
begin
  if not public.has_permission('families.edit') then
    raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  select * into m from public.meetings where id=p_meeting_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if not public.user_has_family_access(m.family_id) then
    raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;

  select count(*) into undecided from public.meeting_items
   where meeting_id=p_meeting_id and visible_to_client and client_decision is null;
  if undecided > 0 and not p_force then
    raise exception 'UNDECIDED_ITEMS: % items still have no client decision', undecided
      using errcode='P0001'; end if;

  for it in select * from public.meeting_items where meeting_id=p_meeting_id loop
    update public.meeting_items set client_decision=coalesce(client_decision,'undecided')
     where id=it.id;
    update public.family_services set status = case coalesce(it.client_decision,'undecided')
        when 'progress'  then 'client_approved_execution'
        when 'thinking'  then 'client_thinking'
        when 'declined'  then 'client_declined'
        when 'no_action' then 'no_execution_needed'
        else status end
     where id = it.family_service_id;
  end loop;

  update public.meetings set status='completed', completed_at=now() where id=p_meeting_id returning * into m;
  update public.families set meeting_held=true where id=m.family_id;
  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (m.family_id,'meeting_completed','פגישת הסיכום התקיימה', public.current_profile_id());
  return m;
end;
$$;

-- --------------------------------------------------------- הוספת תחום למשפחה
create or replace function public.rpc_add_family_service(p_family_id uuid, p_service_id uuid)
returns public.family_services
language plpgsql security definer set search_path = public as $$
declare fs public.family_services%rowtype; svc public.services%rowtype;
begin
  if not public.has_permission('families.edit') then
    raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  if not public.user_has_family_access(p_family_id) then
    raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  select * into svc from public.services where id=p_service_id;
  if not found or not svc.active then
    raise exception 'INVALID_STATE: service missing or inactive' using errcode='P0001'; end if;

  -- הכפילות נחסמת גם כאן וגם ע"י ה-UNIQUE ברמת הטבלה
  insert into public.family_services(family_id, service_id, status)
  values (p_family_id, p_service_id, 'waiting_analysis')
  on conflict (family_id, service_id) do nothing
  returning * into fs;
  if fs.id is null then
    select * into fs from public.family_services
     where family_id=p_family_id and service_id=p_service_id;
    return fs;
  end if;

  insert into public.timeline_events(family_id, event_type, title, actor_profile_id)
  values (p_family_id,'service_added','התחום '||svc.name||' נוסף לתיק', public.current_profile_id());
  return fs;
end;
$$;

-- --------------------------------------------------------- הרשאות הרצה
-- הפונקציות רצות כ-SECURITY DEFINER אך בודקות הרשאה בעצמן.
do $$
declare fn text;
begin
  foreach fn in array array[
    'rpc_send_to_analysis(uuid,uuid,text)',
    'rpc_submit_analysis(uuid,jsonb)',
    'rpc_approve_analysis(uuid)',
    'rpc_send_to_execution(uuid,uuid,uuid[],text)',
    'rpc_start_execution(uuid)',
    'rpc_report_execution_complete(uuid,text,text,text,text,numeric)',
    'rpc_approve_execution(uuid)',
    'rpc_return_execution(uuid,text)',
    'rpc_close_not_completed(uuid,text,text)',
    'rpc_cancel_execution_send(uuid,text)',
    'rpc_reassign_execution(uuid,uuid,text)',
    'rpc_finish_meeting(uuid,boolean)',
    'rpc_add_family_service(uuid,uuid)']
  loop
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;
