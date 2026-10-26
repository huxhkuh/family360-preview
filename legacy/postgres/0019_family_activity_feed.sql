begin;
create function public.rpc_family_activity(p_family_id uuid,p_kind text default 'all',p_cursor jsonb default null,p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rows jsonb;last_row jsonb;cursor_time timestamptz;cursor_key text;
begin
 perform public.require_session();
 if public.staff_family_access(p_family_id) is not true then raise exception 'PERMISSION_DENIED' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('all','contact','task','event') or p_limit is null or p_limit not between 1 and 50 then raise exception 'VALIDATION';end if;
 if p_cursor is not null then
  if jsonb_typeof(p_cursor) is distinct from 'object' or p_cursor->>'at' is null or p_cursor->>'key' is null then raise exception 'VALIDATION';end if;
  cursor_time:=(p_cursor->>'at')::timestamptz;cursor_key:=p_cursor->>'key';
  if not isfinite(cursor_time) or length(cursor_key)>100 then raise exception 'VALIDATION';end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by at desc,key desc),'[]') into rows from (
  select * from (
   select 'event:'||t.id as key,t.created_at as at,'event' as kind,t.title,''::text as detail,''::text as author,'overview' as target
   from public.timeline_events t where t.family_id=p_family_id
   union all
   select 'contact:'||c.id,c.occurred_at,'contact',case c.kind when 'phone' then 'שיחת טלפון' when 'meeting' then 'מפגש' when 'message' then 'הודעה שהתקבלה או נשלחה' else 'קשר אחר' end,c.summary,p.name,'overview'
   from f360.family_contacts c join public.profiles p on p.id=c.created_by where c.family_id=p_family_id
   union all
   select 'task:'||t.id,t.updated_at,'task',t.title,case t.status when 'open' then 'לביצוע' when 'in_progress' then 'בטיפול' when 'completed' then 'הושלם' else 'בוטל' end,p.name,'followups'
   from f360.family_tasks t join public.profiles p on p.id=t.updated_by where t.family_id=p_family_id
   union all
   select 'followup:'||t.id,t.updated_at,'task',t.title,case t.status when 'open' then 'לביצוע' when 'in_progress' then 'בטיפול' when 'completed' then 'הושלם' else 'בוטל' end,'','followups'
   from f360.meeting_followups t where t.family_id=p_family_id
  ) events where (p_kind='all' or kind=p_kind) and (p_cursor is null or (at,key)<(cursor_time,cursor_key))
  order by at desc,key desc limit p_limit+1
 ) r;
 if jsonb_array_length(rows)>p_limit then rows:=rows-p_limit;last_row:=rows->(p_limit-1);end if;
 return jsonb_build_object('items',rows,'next',case when last_row is not null then jsonb_build_object('at',last_row->>'at','key',last_row->>'key') else null end);
end $$;
revoke all on function public.rpc_family_activity(uuid,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.rpc_family_activity(uuid,text,jsonb,integer) to authenticated;
commit;
