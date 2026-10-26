begin;
-- Match the visible household sections. Preserve stored partner answers and
-- existing function permissions; only married households require partner fields.
create or replace function public.validate_onboarding(a jsonb)
returns void language plpgsql immutable set search_path=public as $$
declare required text[]:=array['h_first','h_last','h_id','h_dob','h_phone','h_email','marital','city','address','h_emp','housing','has_car','bank_count']; k text;
begin
 if jsonb_typeof(a) is distinct from 'object' then raise exception 'VALIDATION: answers'; end if;
 if a->>'marital' not in ('married','single','divorced','widowed') or a->>'housing' not in ('own','rent','family')
 or a->>'h_emp' not in ('emp','self','avrech','none','other') or a->>'has_car' not in ('yes','no') then raise exception 'VALIDATION: selection'; end if;
 if a->>'marital'='married' then
  required:=required||array['w_first','w_id','w_dob','w_emp'];
  if a->>'w_emp' not in ('emp','self','none','other') then raise exception 'VALIDATION: selection'; end if;
  if a->>'w_emp'='emp' then required:=required||array['w_work','w_gross']; end if;
 end if;
 if a->>'h_emp'='emp' then required:=required||array['h_work','h_gross']; end if;
 if a->>'h_emp'='self' then required:=required||array['h_biz_type']; end if;
 if a->>'housing'='rent' then required:=required||array['rent_amount','rent_aid_now']; end if;
 if a->>'housing'='own' then
  required:=required||array['has_mortgage'];
  if a->>'has_mortgage'='yes' then required:=required||array['mort_bank','mort_balance','mort_monthly']; end if;
 end if;
 foreach k in array required loop
  if jsonb_typeof(a->k) not in ('string','number') or length(trim(coalesce(a->>k,'')))=0 then raise exception 'VALIDATION: required field %',k; end if;
 end loop;
end $$;
commit;
