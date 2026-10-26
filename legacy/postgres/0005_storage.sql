-- ============================================================================
-- 0005_storage.sql — Supabase Storage
--
-- החלטה: שלושה Buckets נפרדים ולא אחד.
-- הסיבה איננה אסתטית — לכל אחד מודל הרשאות שונה במהותו:
--   family-documents      : הלקוח מעלה וקורא. בעל מקצוע — רק דרך שיוך מפורש.
--   analysis-attachments  : בעל המקצוע מעלה. הלקוח לעולם לא קורא (מסמך מקצועי).
--   execution-attachments : בעל המקצוע מעלה במהלך הביצוע.
-- Bucket אחד היה מכריח כל policy לפענח את התיקייה הראשונה מהנתיב כדי להבין
-- באיזה מודל מדובר — כלומר להסתמך על מבנה המחרוזת, בדיוק מה שסעיף 2 אוסר.
--
-- מבנה נתיב (למעקב וניקוי בלבד — לא כבסיס להרשאה):
--   family-documents/{family_id}/{document_id}/{filename}
--   analysis-attachments/{family_id}/{analysis_task_id}/{filename}
--   execution-attachments/{family_id}/{execution_task_id}/{filename}
--
-- ההרשאה נגזרת תמיד מרשומת ה-DB (documents / task_documents / tasks),
-- אף פעם לא משם הקובץ.
-- כל ה-Buckets פרטיים; הגישה בפועל היא דרך Signed URL קצר-מועד.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('family-documents','family-documents', false, 20971520,
    array['application/pdf','image/jpeg','image/png','image/webp','image/heic',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword']),
  ('analysis-attachments','analysis-attachments', false, 20971520,
    array['application/pdf','image/jpeg','image/png','image/webp',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword']),
  ('execution-attachments','execution-attachments', false, 20971520,
    array['application/pdf','image/jpeg','image/png','image/webp',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword'])
on conflict (id) do nothing;

-- ------------------------------------------------- helper: בעלות על אובייקט
-- מאתר את רשומת ה-documents לפי storage_path, ומכריע לפיה בלבד.
create or replace function public.storage_doc_readable(p_bucket text, p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.documents d
     where d.storage_path = p_bucket || '/' || p_name
       and (public.user_has_family_access(d.family_id)
            or public.pro_can_read_document(d.id)));
$$;

create or replace function public.storage_doc_writable(p_bucket text, p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.documents d
     where d.storage_path = p_bucket || '/' || p_name
       and (public.has_permission('documents.manage')
            or exists (select 1 from public.families f
                        where f.id = d.family_id
                          and f.client_profile_id = public.current_profile_id())));
$$;

-- קובץ ניתוח/ביצוע: רק בעל המקצוע של המשימה, או מי שיש לו גישה למשפחה
create or replace function public.storage_task_file_readable(p_task_id uuid, p_kind text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when p_kind = 'analysis' then exists (
      select 1 from public.analysis_tasks t where t.id = p_task_id
       and (t.professional_id = public.current_professional_id()
            or public.user_has_family_access(t.family_id)))
    else exists (
      select 1 from public.execution_tasks e where e.id = p_task_id
       and (e.professional_id = public.current_professional_id()
            or public.user_has_family_access(e.family_id)))
  end;
$$;

-- ---------------------------------------------------------------- policies
-- family-documents
create policy fd_read on storage.objects for select
  using (bucket_id = 'family-documents'
         and public.storage_doc_readable(bucket_id, name));
create policy fd_insert on storage.objects for insert
  with check (bucket_id = 'family-documents'
              and public.user_has_family_access((split_part(name,'/',1))::uuid));
create policy fd_update on storage.objects for update
  using (bucket_id = 'family-documents' and public.storage_doc_writable(bucket_id, name));
create policy fd_delete on storage.objects for delete
  using (bucket_id = 'family-documents' and public.is_admin());

-- analysis-attachments  (הלקוח אינו כלול בכוונה — מסמך מקצועי לנציג/בעל מקצוע)
create policy aa_read on storage.objects for select
  using (bucket_id = 'analysis-attachments'
         and public.storage_task_file_readable((split_part(name,'/',2))::uuid,'analysis'));
create policy aa_insert on storage.objects for insert
  with check (bucket_id = 'analysis-attachments'
              and exists (select 1 from public.analysis_tasks t
                          where t.id = (split_part(name,'/',2))::uuid
                            and t.professional_id = public.current_professional_id()));
create policy aa_delete on storage.objects for delete
  using (bucket_id = 'analysis-attachments' and public.is_admin());

-- execution-attachments
create policy ea_read on storage.objects for select
  using (bucket_id = 'execution-attachments'
         and public.storage_task_file_readable((split_part(name,'/',2))::uuid,'execution'));
create policy ea_insert on storage.objects for insert
  with check (bucket_id = 'execution-attachments'
              and exists (select 1 from public.execution_tasks e
                          where e.id = (split_part(name,'/',2))::uuid
                            and e.professional_id = public.current_professional_id()));
create policy ea_delete on storage.objects for delete
  using (bucket_id = 'execution-attachments' and public.is_admin());

-- ------------------------------------------------- החלפת קובץ = תיעוד, לא מחיקה
create or replace function public.rpc_replace_document_file(
  p_document_id uuid, p_storage_path text, p_file_name text,
  p_file_size bigint default null, p_mime text default null)
returns public.documents
language plpgsql security definer set search_path = public as $$
declare d public.documents%rowtype; old_path text;
begin
  select * into d from public.documents where id = p_document_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if not (public.user_has_family_access(d.family_id)) then
    raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
  old_path := d.storage_path;

  update public.documents
     set storage_path=p_storage_path, file_name=p_file_name, file_size=p_file_size,
         mime_type=p_mime, status='pending', uploaded_at=now(), reject_reason=null
   where id=p_document_id returning * into d;

  insert into public.timeline_events(family_id, event_type, title, description, actor_profile_id, metadata)
  values (d.family_id,'document_replaced','הוחלף הקובץ במסמך "'||d.name||'"', null,
          public.current_profile_id(), jsonb_build_object('old_path', old_path,'new_path', p_storage_path));
  perform public.write_audit('replace','document', d.id, d.name,
          'הוחלף קובץ במסמך', jsonb_build_object('old_path', old_path));
  return d;
end;
$$;
grant execute on function public.rpc_replace_document_file(uuid,text,text,bigint,text) to authenticated;
