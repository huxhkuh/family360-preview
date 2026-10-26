begin;
insert into f360.meeting_topic_catalog(key,title) values
 ('life_cover','ביטוח חיים למשפחה'),('child_support','סיוע לילד שזקוק להשגחה או לתמיכה'),
 ('communications','טלפונים ותקשורת'),('combined_employment','תיאומים בעבודה משולבת');
-- Legacy scalar answers and new multiple selections have the same meaning.
create function f360.employment_values(v jsonb) returns jsonb language sql immutable as $$
 select case jsonb_typeof(v) when 'string' then jsonb_build_array(v) when 'array' then v else '[]'::jsonb end
$$;
revoke all on function f360.employment_values(jsonb) from public,anon,authenticated;

create or replace function public.rule_matches(p_answers jsonb,p_rule jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare v jsonb:=p_answers->(p_rule->>'field'); target jsonb:=p_rule->'value';
begin
 if p_rule->>'op'='exists' then return v is not null and v not in ('null'::jsonb,'""'::jsonb,'[]'::jsonb); end if;
 if v is null or v in ('null'::jsonb,'""'::jsonb,'[]'::jsonb) or target is null or target='null'::jsonb then return false; end if;
 if p_rule->>'field' in ('h_emp','w_emp') and jsonb_typeof(target)='string' then
  if jsonb_typeof(v)='array' and p_rule->>'op' in ('equals','not_equals','contains') then
   return case when p_rule->>'op'='not_equals' then not(v @> jsonb_build_array(target)) else v @> jsonb_build_array(target) end;
  elsif p_rule->>'op'='contains' and jsonb_typeof(v)='string' then return v=target; end if;
 end if;
 case p_rule->>'op'
 when 'equals' then return v=target;
 when 'not_equals' then return v<>target;
 when 'contains' then return case when jsonb_typeof(v)='array' then v @> jsonb_build_array(target) else false end;
 when 'gt' then return coalesce((v#>>'{}')::numeric>(target#>>'{}')::numeric,false);
 when 'lt' then return coalesce((v#>>'{}')::numeric<(target#>>'{}')::numeric,false);
 else return false;
 end case;
exception when invalid_text_representation then return false;
end $$;

create or replace function public.validate_onboarding(a jsonb)
returns void language plpgsql immutable set search_path=public as $$
declare required text[]:=array['h_first','h_last','h_id','h_dob','h_phone','h_email','marital','city','address','housing','has_car','bank_count']; k text; person text; values_json jsonb;
begin
 if jsonb_typeof(a) is distinct from 'object' then raise exception 'VALIDATION: answers'; end if;
 if a->>'marital' not in ('married','single','divorced','widowed') or a->>'housing' not in ('own','rent','family') or a->>'has_car' not in ('yes','no') then raise exception 'VALIDATION: selection'; end if;
 if a->>'marital'='married' then required:=required||array['w_first','w_id','w_dob']; end if;
 foreach person in array array['h','w'] loop
  if person='w' and a->>'marital' is distinct from 'married' then continue; end if;
  values_json:=f360.employment_values(a->(person||'_emp'));
  if jsonb_array_length(values_json)=0
   or exists(select 1 from jsonb_array_elements(values_json) x where jsonb_typeof(x)<>'string' or x#>>'{}' not in ('emp','self','avrech','none','other') or (person='w' and x='"avrech"'::jsonb))
   or (select count(*) from jsonb_array_elements(values_json))<>(select count(distinct x) from jsonb_array_elements(values_json) x)
   or (jsonb_array_length(values_json)>1 and (values_json ? 'none' or values_json ? 'other'))
  then raise exception 'VALIDATION: employment'; end if;
  if values_json ? 'emp' then required:=required||array[person||'_work',person||'_gross']; end if;
  if person='h' and values_json ? 'self' then required:=required||array['h_biz_type']; end if;
 end loop;
 if a->>'housing'='rent' then required:=required||array['rent_amount','rent_aid_now']; end if;
 if a->>'housing'='own' then
  required:=required||array['has_mortgage'];
  if a->>'has_mortgage'='yes' then required:=required||array['mort_bank','mort_balance','mort_monthly']; end if;
 end if;
 foreach k in array required loop
  if jsonb_typeof(a->k) not in ('string','number') or length(trim(coalesce(a->>k,'')))=0 then raise exception 'VALIDATION: required field %',k; end if;
 end loop;
end $$;

alter function public.rpc_workspace() rename to rpc_workspace_phase2;
alter function public.rpc_workspace_phase2() set schema f360;
revoke all on function f360.rpc_workspace_phase2() from public,anon,authenticated;
create function public.rpc_workspace() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin perform public.require_session();return f360.rpc_workspace_phase2()||jsonb_build_object('questionnaireV2Enabled',true);end $$;
revoke all on function public.rpc_workspace() from public,anon,authenticated;
grant execute on function public.rpc_workspace() to authenticated;
commit;
