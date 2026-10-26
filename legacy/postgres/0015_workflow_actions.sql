begin;
-- Save the decision and its explicitly requested next step in one transaction.
create function public.rpc_save_decision_followup(p_meeting_id uuid,p_item_id uuid,p_decision text,p_note text,p_instructions text,p_followup_id uuid,p_followup jsonb,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare m public.meetings%rowtype; i public.meeting_items%rowtype; result jsonb;
begin
 perform public.require_session();
 select * into m from public.meetings where id=p_meeting_id for update;
 if m.id is null or (public.staff_family_access(m.family_id) and public.has_permission('families.edit')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if m.status<>'in_progress' then raise exception 'INVALID_STATE'; end if;
 select * into i from public.meeting_items where id=p_item_id and meeting_id=m.id and family_id=m.family_id for update;
 if i.id is null then raise exception 'NOT_FOUND'; end if;
 if p_decision is distinct from 'thinking' or p_followup_id is null or p_followup is null or length(coalesce(p_note,''))>5000 or length(coalesce(p_instructions,''))>5000 then raise exception 'VALIDATION'; end if;
 -- A concurrent editor or an existing active next step must never be duplicated.
 if exists(select 1 from f360.meeting_followups where item_id=i.id and status in ('open','in_progress') and id<>p_followup_id) then raise exception 'CONFLICT: existing follow-up'; end if;
 if exists(select 1 from f360.meeting_followups where id=p_followup_id and item_id is distinct from i.id) then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 perform public.rpc_meeting_action(m.id,'decision',jsonb_build_object('item_id',i.id,'client_decision',p_decision,'decision_note',p_note,'execution_instructions',p_instructions,'approved_actions',i.approved_actions));
 result:=public.rpc_save_meeting_followup(p_followup_id,m.id,p_followup||jsonb_build_object('item_id',i.id),p_expected_revision);
 return result;
end $$;

create function public.rpc_manage_meeting(p_meeting_id uuid,p_action text,p_expected_scheduled_at timestamptz,p_scheduled_at timestamptz default null,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare m public.meetings%rowtype;
begin
 perform public.require_session();
 select * into m from public.meetings where id=p_meeting_id for update;
 if m.id is null or (public.staff_family_access(m.family_id) and public.has_permission('families.edit')) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if m.status<>'scheduled' then raise exception 'INVALID_STATE: scheduled meeting required'; end if;
 if m.scheduled_at is distinct from p_expected_scheduled_at then raise exception 'CONFLICT'; end if;
 if p_action='reschedule' then
  if p_scheduled_at is null or not isfinite(p_scheduled_at) then raise exception 'VALIDATION'; end if;
  perform public.rpc_meeting_action(m.id,'reschedule',jsonb_build_object('scheduled_at',p_scheduled_at));
 elsif p_action='cancel' then
  if length(trim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'VALIDATION'; end if;
  perform public.rpc_meeting_action(m.id,'cancel',jsonb_build_object('reason',p_reason));
  update public.families set status='ready_meeting' where id=m.family_id and status='meeting_set'
   and not exists(select 1 from public.meetings where family_id=m.family_id and status in ('scheduled','in_progress'));
 else raise exception 'VALIDATION'; end if;
end $$;

-- Advertise the new commands only after this migration is installed.
alter function public.rpc_workspace() rename to rpc_workspace_phase1;
alter function public.rpc_workspace_phase1() set schema f360;
revoke all on function f360.rpc_workspace_phase1() from public,anon,authenticated;
create function public.rpc_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin perform public.require_session();return f360.rpc_workspace_phase1()||jsonb_build_object('workflowV2Enabled',true);end $$;
revoke all on function public.rpc_save_decision_followup(uuid,uuid,text,text,text,uuid,jsonb,integer),public.rpc_manage_meeting(uuid,text,timestamptz,timestamptz,text),public.rpc_workspace() from public,anon,authenticated;
grant execute on function public.rpc_save_decision_followup(uuid,uuid,text,text,text,uuid,jsonb,integer),public.rpc_manage_meeting(uuid,text,timestamptz,timestamptz,text),public.rpc_workspace() to authenticated;
commit;
