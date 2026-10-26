begin;
insert into public.automations(key,name,event_key,channel,active) values
 ('task_state_changes','עדכוני מצב משימות','task_state_changes','in_app',true),
 ('sla_overdue','תזכורת יומית לחריגה מזמן טיפול','sla_overdue','in_app',true)
 on conflict(key) do nothing;

create or replace function public.notify_task_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='UPDATE' and old.status is not distinct from new.status then return new; end if;
 if not exists(select 1 from public.automations where key='task_state_changes' and active and channel='in_app') then return new; end if;
 insert into public.notifications(profile_id,family_id,title,body,type)
 select distinct p.id,new.family_id,'עודכן מצב משימה',new.task_number||' · '||new.status,'task_status'
 from public.profiles p where p.active and (
 (p.role='professional' and exists(select 1 from public.professionals pr where pr.id=new.professional_id and pr.profile_id=p.id and pr.active))
 or (p.role='representative' and exists(select 1 from public.families f join public.representatives r on r.id=f.representative_id where f.id=new.family_id and r.profile_id=p.id and r.active)));
 return new;
end $$;
create trigger notify_analysis_change after insert or update on public.analysis_tasks for each row execute function public.notify_task_change();
create trigger notify_execution_change after insert or update on public.execution_tasks for each row execute function public.notify_task_change();

-- Non-exposed, idempotent receipts. A retry cannot send the same daily reminder twice.
create table f360.reminder_receipts (
 task_id uuid not null,profile_id uuid not null,day date not null,
 primary key(task_id,profile_id,day)
);
create or replace function f360.run_sla_reminders()
returns integer language plpgsql security definer set search_path=public as $$
declare count_sent integer;
begin
 if not exists(select 1 from public.automations where key='sla_overdue' and active and channel='in_app') then return 0; end if;
 with overdue as (
  select id,family_id,professional_id,task_number from public.analysis_tasks where due_at<now() and status in ('assigned','in_progress','needs_info','returned')
  union all select id,family_id,professional_id,task_number from public.execution_tasks where due_at<now() and status in ('sent_execution','execution_in_progress','waiting_client','needs_info')
 ), recipients as (
  select distinct t.id,t.family_id,t.task_number,p.id profile_id from overdue t join public.profiles p on p.active and (
   (p.role='professional' and exists(select 1 from public.professionals pr where pr.id=t.professional_id and pr.profile_id=p.id and pr.active))
   or (p.role='representative' and exists(select 1 from public.families f join public.representatives r on r.id=f.representative_id where f.id=t.family_id and r.profile_id=p.id and r.active)))
 ), claimed as (
  insert into f360.reminder_receipts(task_id,profile_id,day)
  select id,profile_id,(now() at time zone 'UTC')::date from recipients on conflict do nothing returning task_id,profile_id
 ) insert into public.notifications(profile_id,family_id,title,body,type)
 select r.profile_id,r.family_id,'משימה חרגה מזמן הטיפול',r.task_number||' — יש לבדוק את המשימה ולעדכן את ההתקדמות.','sla_overdue'
 from recipients r join claimed c on c.task_id=r.id and c.profile_id=r.profile_id;
 get diagnostics count_sent=row_count;
 return count_sent;
end $$;
create or replace function public.rpc_run_reminders()
returns integer language plpgsql security definer set search_path=public as $$
declare count_sent integer;
begin
 perform public.require_session();
 if not public.is_admin() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 count_sent:=f360.run_sla_reminders();
 perform public.write_audit('run','reminders',null,'SLA reminders','Notifications created',jsonb_build_object('count',count_sent));
 return count_sent;
end $$;
revoke all on f360.reminder_receipts from public,anon,authenticated;
revoke all on function f360.run_sla_reminders() from public,anon,authenticated;
commit;
