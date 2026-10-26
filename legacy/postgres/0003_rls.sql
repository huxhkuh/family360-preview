-- ============================================================================
-- 0003_rls.sql — Row Level Security
-- עיקרון: ברירת המחדל היא חסימה. כל גישה נפתחת במפורש ולפי Role.
-- ההגנה תקפה גם אם פונים ל-Supabase ישירות ועוקפים את ה-Frontend.
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array['profiles','representatives','professionals','services',
    'professional_services','families','family_services','document_types','documents',
    'analysis_tasks','meetings','meeting_items','execution_tasks','execution_updates',
    'execution_messages','task_documents','timeline_events','notifications',
    'message_templates','email_logs','automations','system_settings','audit_log','counters']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ profiles
create policy profiles_self_read on public.profiles for select
  using (auth_user_id = auth.uid() or public.is_admin()
         -- נציג רואה פרופילים של בעלי מקצוע ונציגים (לצורך בחירה ותצוגה)
         or (public.current_representative_id() is not null
             and role in ('professional','representative')));
create policy profiles_self_update on public.profiles for update
  using (auth_user_id = auth.uid() or public.is_admin())
  with check (auth_user_id = auth.uid() or public.is_admin());
-- RLS מגביל שורות, לא עמודות. הרשאות עמודה מונעות שינוי עצמי של role,
-- active או auth_user_id גם כאשר המשתמש רשאי לערוך את פרטי הקשר שלו.
revoke update on public.profiles from authenticated;
grant update (name, email, phone) on public.profiles to authenticated;
create policy profiles_admin_write on public.profiles for insert
  with check (public.is_admin());
create policy profiles_admin_delete on public.profiles for delete
  using (public.is_admin());

-- ----------------------------------------------------------- representatives
create policy reps_read on public.representatives for select
  using (public.is_admin()
         or profile_id = public.current_profile_id()
         or public.current_representative_id() is not null);
create policy reps_admin_all on public.representatives for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------- professionals
-- כולם רואים את הרשומה הבסיסית (נדרש לבחירה ולתצוגת שם),
-- אך commercial_note / internal_note נחסמים דרך ה-View בהמשך הקובץ.
create policy pros_read on public.professionals for select
  using (public.is_admin()
         or profile_id = public.current_profile_id()
         or public.current_representative_id() is not null);
create policy pros_admin_all on public.professionals for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ services
create policy services_read on public.services for select
  using (auth.uid() is not null);
create policy services_admin_all on public.services for all
  using (public.has_permission('services.manage'))
  with check (public.has_permission('services.manage'));

create policy ps_read on public.professional_services for select
  using (auth.uid() is not null);
create policy ps_admin_all on public.professional_services for all
  using (public.has_permission('professionals.manage'))
  with check (public.has_permission('professionals.manage'));

-- ------------------------------------------------------------------ families
create policy families_read on public.families for select
  using (public.user_has_family_access(id)
         -- בעל מקצוע רואה רק משפחה שיש לו בה משימה בפועל
         or (public.current_professional_id() is not null and public.pro_has_family_touch(id)));
create policy families_write on public.families for update
  using (public.has_permission('families.edit') and public.user_has_family_access(id))
  with check (public.has_permission('families.edit') and public.user_has_family_access(id));
create policy families_insert on public.families for insert
  with check (public.has_permission('families.edit'));
create policy families_delete on public.families for delete
  using (public.is_admin());

-- ------------------------------------------------------------ family_services
create policy fs_read on public.family_services for select
  using (public.user_has_family_access(family_id)
         -- בעל מקצוע רואה אך ורק את התחום שהוקצה לו — לא תחומים אחרים של המשפחה
         or (public.current_professional_id() is not null and exists (
               select 1 from public.analysis_tasks t
                where t.family_service_id = family_services.id
                  and t.professional_id = public.current_professional_id())
             or exists (
               select 1 from public.execution_tasks e
                where e.family_service_id = family_services.id
                  and e.professional_id = public.current_professional_id())));
create policy fs_write on public.family_services for update
  using (public.user_has_family_access(family_id) and public.has_permission('families.edit'))
  with check (public.user_has_family_access(family_id));
create policy fs_insert on public.family_services for insert
  with check (public.user_has_family_access(family_id) and public.has_permission('families.edit'));

-- ------------------------------------------------------------- document_types
create policy doctypes_read on public.document_types for select
  using (auth.uid() is not null);
create policy doctypes_admin on public.document_types for all
  using (public.has_permission('services.manage'))
  with check (public.has_permission('services.manage'));

-- ----------------------------------------------------------------- documents
create policy documents_read on public.documents for select
  using (public.user_has_family_access(family_id)
         -- בעל מקצוע: רק מסמך ששויך במפורש למשימה שלו
         or (public.current_professional_id() is not null and public.pro_can_read_document(id)));
create policy documents_write on public.documents for update
  using (public.has_permission('documents.manage') and public.user_has_family_access(family_id)
         -- הלקוח רשאי לעדכן מסמך של עצמו (העלאה)
         or exists (select 1 from public.families f
                    where f.id = documents.family_id
                      and f.client_profile_id = public.current_profile_id()))
  with check (public.user_has_family_access(family_id));
create policy documents_insert on public.documents for insert
  with check (public.user_has_family_access(family_id));
create policy documents_delete on public.documents for delete
  using (public.is_admin());

-- ------------------------------------------------------------ analysis_tasks
create policy at_read on public.analysis_tasks for select
  using (public.user_has_family_access(family_id)
         or professional_id = public.current_professional_id());
create policy at_pro_update on public.analysis_tasks for update
  -- בעל מקצוע מעדכן אך ורק משימה שלו
  using (professional_id = public.current_professional_id()
         or (public.has_permission('analysis.approve') and public.user_has_family_access(family_id)))
  with check (professional_id = public.current_professional_id()
         or (public.has_permission('analysis.approve') and public.user_has_family_access(family_id)));
create policy at_insert on public.analysis_tasks for insert
  with check (public.has_permission('analysis.send') and public.user_has_family_access(family_id));

-- ----------------------------------------------------------------- meetings
create policy meetings_read on public.meetings for select
  using (public.user_has_family_access(family_id));
create policy meetings_write on public.meetings for all
  using (public.user_has_family_access(family_id) and public.has_permission('families.edit'))
  with check (public.user_has_family_access(family_id) and public.has_permission('families.edit'));

-- ------------------------------------------------------------- meeting_items
-- הלקוח רואה רק פריטים המסומנים visible_to_client.
create policy mi_read on public.meeting_items for select
  using (
    case
      when public.current_profile_id() is not null
           and exists (select 1 from public.families f
                       where f.id = meeting_items.family_id
                         and f.client_profile_id = public.current_profile_id())
        then visible_to_client
      else public.user_has_family_access(family_id)
    end);
create policy mi_write on public.meeting_items for all
  using (public.user_has_family_access(family_id) and public.has_permission('families.edit'))
  with check (public.user_has_family_access(family_id) and public.has_permission('families.edit'));

-- ----------------------------------------------------------- execution_tasks
create policy et_read on public.execution_tasks for select
  using (public.user_has_family_access(family_id)
         or professional_id = public.current_professional_id());
create policy et_update on public.execution_tasks for update
  using (professional_id = public.current_professional_id()
         or (public.has_permission('execution.approve') and public.user_has_family_access(family_id)))
  with check (professional_id = public.current_professional_id()
         or (public.has_permission('execution.approve') and public.user_has_family_access(family_id)));
create policy et_insert on public.execution_tasks for insert
  with check (public.has_permission('execution.send') and public.user_has_family_access(family_id));

-- ------------------------------------------- execution updates / messages
create policy eu_read on public.execution_updates for select
  using (exists (select 1 from public.execution_tasks e where e.id = execution_task_id
                 and (public.user_has_family_access(e.family_id)
                      or e.professional_id = public.current_professional_id())));
create policy eu_insert on public.execution_updates for insert
  with check (exists (select 1 from public.execution_tasks e where e.id = execution_task_id
                      and (e.professional_id = public.current_professional_id()
                           or public.user_has_family_access(e.family_id))));

create policy em_read on public.execution_messages for select
  using (exists (select 1 from public.execution_tasks e where e.id = execution_task_id
                 and (public.user_has_family_access(e.family_id)
                      or e.professional_id = public.current_professional_id())));
create policy em_insert on public.execution_messages for insert
  with check (exists (select 1 from public.execution_tasks e where e.id = execution_task_id
                      and (e.professional_id = public.current_professional_id()
                           or public.user_has_family_access(e.family_id))));
create policy em_update on public.execution_messages for update
  using (exists (select 1 from public.execution_tasks e where e.id = execution_task_id
                 and (public.user_has_family_access(e.family_id)
                      or e.professional_id = public.current_professional_id())))
  with check (true);

-- ------------------------------------------------------------- task_documents
create policy td_read on public.task_documents for select
  using (exists (select 1 from public.documents d where d.id = document_id
                 and public.user_has_family_access(d.family_id))
         or exists (select 1 from public.analysis_tasks a where a.id = analysis_task_id
                    and a.professional_id = public.current_professional_id())
         or exists (select 1 from public.execution_tasks e where e.id = execution_task_id
                    and e.professional_id = public.current_professional_id()));
create policy td_write on public.task_documents for all
  using (exists (select 1 from public.documents d where d.id = document_id
                 and public.user_has_family_access(d.family_id)))
  with check (exists (select 1 from public.documents d where d.id = document_id
                      and public.user_has_family_access(d.family_id)));

-- ------------------------------------------------------------ timeline_events
-- Timeline מלא הוא כלי של הנציג/אדמין. בעל מקצוע אינו רואה אותו כלל.
create policy tl_read on public.timeline_events for select
  using (public.user_has_family_access(family_id));
create policy tl_insert on public.timeline_events for insert
  with check (public.user_has_family_access(family_id));

-- ------------------------------------------------------------- notifications
create policy notif_read on public.notifications for select
  using (profile_id = public.current_profile_id());
create policy notif_update on public.notifications for update
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());
create policy notif_insert on public.notifications for insert
  with check (auth.uid() is not null);

-- ---------------------------------------------------- templates / automations
create policy tpl_read on public.message_templates for select
  using (public.current_role_name() in ('admin','representative'));
create policy tpl_admin on public.message_templates for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

create policy autom_read on public.automations for select
  using (public.current_role_name() in ('admin','representative'));
create policy autom_admin on public.automations for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

-- ----------------------------------------------------------------- email_logs
create policy email_read on public.email_logs for select
  using (public.is_admin()
         or (family_id is not null and public.user_has_family_access(family_id)));
create policy email_insert on public.email_logs for insert
  with check (auth.uid() is not null);

-- ------------------------------------------------------------ system_settings
create policy settings_read on public.system_settings for select
  using (auth.uid() is not null);
create policy settings_write on public.system_settings for all
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

-- ------------------------------------------------------------------ audit_log
-- קריאה: admin בלבד. כתיבה: רק דרך write_audit (SECURITY DEFINER).
-- אין policy ל-UPDATE/DELETE — ובנוסף Trigger חוסם ברמת הטבלה.
create policy audit_read on public.audit_log for select
  using (public.is_admin());

-- ------------------------------------------------------------------- counters
-- אין גישה ישירה; רק דרך next_task_number (SECURITY DEFINER).

-- ============================================================================
-- Views מוגנים — הסתרת שדות פנימיים ברמת עמודה
-- ============================================================================
create or replace view public.professionals_public
with (security_invoker = true) as
  select id, profile_id, business_name, active, analysis_enabled, execution_enabled,
         analysis_sla_hours, execution_sla_hours, analysis_sla_overrides,
         execution_sla_overrides, created_at, updated_at
    from public.professionals;

comment on view public.professionals_public is
  'ללא commercial_note / internal_note / agreement_type — לשימוש כל מי שאינו admin';
