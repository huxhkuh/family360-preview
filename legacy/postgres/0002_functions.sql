-- ============================================================================
-- 0002_functions.sql — Security Helpers, Triggers, הגנת Audit
-- ============================================================================

-- ---------------------------------------------------------- Security Helpers
-- כולן STABLE + SECURITY DEFINER כדי שיוכלו לקרוא את profiles מתוך policy
-- בלי ליצור רקורסיה של RLS על אותה טבלה.

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles
                   where auth_user_id = auth.uid() and active limit 1), false);
$$;

-- מזהה הנציג/בעל המקצוע המקושר למשתמש הנוכחי (null אם אינו כזה, או מושבת)
create or replace function public.current_representative_id()
returns uuid language sql stable security definer set search_path = public as $$
  select r.id from public.representatives r
  join public.profiles p on p.id = r.profile_id
  where p.auth_user_id = auth.uid() and p.active and r.active limit 1;
$$;

create or replace function public.current_professional_id()
returns uuid language sql stable security definer set search_path = public as $$
  select pr.id from public.professionals pr
  join public.profiles p on p.id = pr.profile_id
  where p.auth_user_id = auth.uid() and p.active and pr.active limit 1;
$$;

-- הרשאת נציג. Admin מקבל הכול. משתמש מושבת — לא מקבל דבר.
create or replace function public.has_permission(permission_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then true
    else coalesce((
      select r.permissions ? permission_key
      from public.representatives r
      join public.profiles p on p.id = r.profile_id
      where p.auth_user_id = auth.uid() and p.active and r.active
      limit 1), false)
  end;
$$;

-- גישה למשפחה: admin | הנציג המשויך | נציג עם families.view_all | הלקוח עצמו
create or replace function public.user_has_family_access(fam_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then true
    when exists (select 1 from public.families f
                 where f.id = fam_id and f.representative_id = public.current_representative_id()
                   and public.current_representative_id() is not null) then true
    when public.current_representative_id() is not null
         and public.has_permission('families.view_all') then true
    when exists (select 1 from public.families f
                 where f.id = fam_id and f.client_profile_id = public.current_profile_id()
                   and public.current_profile_id() is not null) then true
    else false
  end;
$$;

-- בעל מקצוע נחשב "משויך למשפחה" רק דרך משימה פעילה/היסטורית שלו — ולא יותר.
create or replace function public.pro_has_family_touch(fam_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.analysis_tasks t
     where t.family_id = fam_id and t.professional_id = public.current_professional_id())
  or exists (
    select 1 from public.execution_tasks e
     where e.family_id = fam_id and e.professional_id = public.current_professional_id());
$$;

-- כשירות בעל מקצוע לשירות מסוים (המקבילה ל-getEligibleProfessionals ב-v8)
create or replace function public.is_professional_eligible(
  pro_id uuid, svc_id uuid, mode text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.professionals pr
    join public.professional_services ps
      on ps.professional_id = pr.id and ps.service_id = svc_id
    where pr.id = pro_id
      and pr.active
      and case when mode = 'analysis'  then pr.analysis_enabled  and ps.analysis_enabled
               when mode = 'execution' then pr.execution_enabled and ps.execution_enabled
               else false end
  );
$$;

-- מסמך שהונגש לבעל המקצוע הנוכחי דרך שיוך מפורש שלא בוטל
create or replace function public.pro_can_read_document(doc_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.task_documents td
    left join public.analysis_tasks  a on a.id = td.analysis_task_id
    left join public.execution_tasks e on e.id = td.execution_task_id
    where td.document_id = doc_id
      and td.revoked_at is null
      and coalesce(a.professional_id, e.professional_id) = public.current_professional_id()
  );
$$;

-- --------------------------------------------------------------- SLA Resolver
-- מקור אמת יחיד: Override של בעל מקצוע ← SLA של השירות ← ברירת מחדל מערכתית.
-- זהה בדיוק ל-resolveAnalysisSla/resolveExecutionSla ב-v8.
create or replace function public.resolve_sla_hours(
  svc_id uuid, pro_id uuid, mode text)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  svc      public.services%rowtype;
  pro      public.professionals%rowtype;
  ov       integer;
  fallback integer;
begin
  select * into svc from public.services where id = svc_id;
  if not found then return 72; end if;
  select * into pro from public.professionals where id = pro_id;

  if found then
    if mode = 'analysis' then
      ov := nullif(pro.analysis_sla_overrides ->> svc.key, '')::integer;
      if ov is null then ov := pro.analysis_sla_hours; end if;
    else
      ov := nullif(pro.execution_sla_overrides ->> svc.key, '')::integer;
      if ov is null then ov := pro.execution_sla_hours; end if;
    end if;
    if ov is not null and ov > 0 then return ov; end if;
  end if;

  if mode = 'analysis' then fallback := svc.analysis_sla_hours;
  else                      fallback := svc.execution_sla_hours; end if;
  if fallback is not null and fallback > 0 then return fallback; end if;

  select coalesce((value #>> '{}')::integer,
                  case when mode = 'analysis' then 72 else 96 end)
    into fallback
    from public.system_settings
   where key = case when mode = 'analysis' then 'default_analysis_sla' else 'default_execution_sla' end;

  return coalesce(fallback, case when mode = 'analysis' then 72 else 96 end);
end;
$$;

-- ------------------------------------------------------------------- Triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','representatives','professionals','services','families',
    'family_services','document_types','documents','analysis_tasks','meetings','meeting_items',
    'execution_tasks','message_templates','automations']
  loop
    execute format(
      'create trigger trg_%1$s_touch before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- יצירת Profile אוטומטית לאחר הרשמה ב-Auth.
-- נבחר Trigger ולא Admin flow: הוא אטומי מול auth.users, לא ניתן לדילוג
-- (גם הרשמה ישירה דרך Supabase Auth מייצרת Profile), ואינו דורש service_role
-- בצד ה-Frontend. metadata שמגיע מהמשתמש משמש רק לשם תצוגה; תפקיד לעולם לא
-- מתקבל מהלקוח. כל משתמש חדש מתחיל כ-client, והעלאת הרשאה מתבצעת ב-RPC ניהולי.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (auth_user_id, role, name, email)
  values (
    new.id,
    'client',
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email,'user'), '@', 1)),
    new.email)
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

-- SECURITY DEFINER מקבל EXECUTE ל-PUBLIC כברירת מחדל ב-PostgreSQL. מבטלים
-- במפורש את ברירת המחדל ומחזירים רק את ההרשאות המינימליות הנדרשות ל-RLS.
revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.current_role_name() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.current_representative_id() from public, anon;
revoke all on function public.current_professional_id() from public, anon;
revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.user_has_family_access(uuid) from public, anon;
revoke all on function public.pro_has_family_touch(uuid) from public, anon;
revoke all on function public.is_professional_eligible(uuid,uuid,text) from public, anon;
revoke all on function public.pro_can_read_document(uuid) from public, anon;
revoke all on function public.resolve_sla_hours(uuid,uuid,text) from public, anon;
revoke all on function public.handle_new_auth_user() from public, anon;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_role_name() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_representative_id() to authenticated;
grant execute on function public.current_professional_id() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.user_has_family_access(uuid) to authenticated;
grant execute on function public.pro_has_family_touch(uuid) to authenticated;
grant execute on function public.is_professional_eligible(uuid,uuid,text) to authenticated;
grant execute on function public.pro_can_read_document(uuid) to authenticated;
-- (מופעל על auth.users; ב-Supabase יש להריץ עם הרשאות מתאימות)
drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- --------------------------------------------------------- הגנת Audit (חסם קשיח)
-- גם אם policy תיפתח בטעות בעתיד, השכבה הזו חוסמת שינוי או מחיקה.
create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only (attempted %)', tg_op;
end;
$$;
create trigger trg_audit_no_update before update on public.audit_log
  for each row execute function public.audit_log_immutable();
create trigger trg_audit_no_delete before delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- כתיבה ליומן — דרך פונקציה אחת בלבד
create or replace function public.write_audit(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_entity_name text, p_description text, p_metadata jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log(actor_profile_id, actor_role, action, entity_type,
                               entity_id, entity_name, description, metadata)
  values (public.current_profile_id(), public.current_role_name(), p_action, p_entity_type,
          p_entity_id, p_entity_name, p_description, p_metadata);
$$;

-- מספור רץ אטומי
create or replace function public.next_task_number(p_kind text)
returns text language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  update public.counters set value = value + 1
   where key = p_kind returning value into n;
  if n is null then
    insert into public.counters(key, value) values (p_kind, 1) returning value into n;
  end if;
  return case when p_kind = 'analysis_task' then 'AN-' else 'EX-' end || lpad(n::text, 6, '0');
end;
$$;
revoke all on function public.write_audit(text,text,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.next_task_number(text) from public, anon, authenticated;
