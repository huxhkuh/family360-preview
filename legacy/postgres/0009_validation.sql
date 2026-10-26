begin;
-- The browser is not the authority on questionnaire completion.
create or replace function public.validate_onboarding(a jsonb)
returns void language plpgsql immutable set search_path=public as $$
declare required text[]:=array['h_first','h_last','h_id','h_dob','h_phone','h_email','marital','city','address','h_emp','housing','has_car','bank_count']; k text;
begin
 if jsonb_typeof(a) is distinct from 'object' then raise exception 'VALIDATION: answers'; end if;
 if a->>'marital' not in ('married','single','divorced','widowed') or a->>'housing' not in ('own','rent','family')
 or a->>'h_emp' not in ('emp','self','avrech','none','other') or a->>'has_car' not in ('yes','no') then raise exception 'VALIDATION: selection'; end if;
 if a->>'marital'<>'single' then
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

create or replace function public.validate_family_input()
returns trigger language plpgsql set search_path=public as $$
declare k text; item jsonb;
begin
 if jsonb_typeof(new.answers) is distinct from 'object' or length(new.answers::text)>100000
 or length(coalesce(new.contact_name,''))>150 or length(coalesce(new.phone,''))>30
 or length(coalesce(new.email,''))>254 or length(coalesce(new.internal_notes,''))>20000 then raise exception 'VALIDATION: family fields'; end if;
 foreach k in array array['children','loans','savings','ins','banks','extra_income','btl_allowances'] loop
  if new.answers ? k and jsonb_typeof(new.answers->k) is distinct from 'array' then raise exception 'VALIDATION: array field %',k; end if;
 end loop;
 foreach k in array array['children','loans'] loop
  for item in select * from jsonb_array_elements(coalesce(new.answers->k,'[]')) loop
   if jsonb_typeof(item) is distinct from 'object' then raise exception 'VALIDATION: repeat row'; end if;
  end loop;
 end loop;
 return new;
end $$;
create trigger validate_family_input before insert or update on public.families for each row execute function public.validate_family_input();

create or replace function public.validate_service_input()
returns trigger language plpgsql set search_path=public as $$
declare item jsonb; opt jsonb; section jsonb;
begin
 foreach section in array array[new.trigger_conditions,new.client_fields,new.professional_fields,new.required_documents,new.analysis_result_fields] loop
  if jsonb_typeof(section) is distinct from 'array' or jsonb_array_length(section)>100 then raise exception 'VALIDATION: service array'; end if;
 end loop;
 for item in select * from jsonb_array_elements(new.client_fields||new.professional_fields) loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'key','') !~ '^[a-z][a-z0-9_]{0,79}$'
  or length(trim(coalesce(item->>'label','')))=0 then raise exception 'VALIDATION: field definition'; end if;
  if item ? 'required' and jsonb_typeof(item->'required') is distinct from 'boolean' then raise exception 'VALIDATION: required'; end if;
  if item ? 'options' then
   if jsonb_typeof(item->'options') is distinct from 'array' then raise exception 'VALIDATION: options'; end if;
   for opt in select * from jsonb_array_elements(item->'options') loop
    if jsonb_typeof(opt) is distinct from 'string' then raise exception 'VALIDATION: option'; end if;
   end loop;
  end if;
 end loop;
 for item in select * from jsonb_array_elements(new.required_documents) loop
  if coalesce(item->>'doc_key','') !~ '^[a-z][a-z0-9_]*$' then raise exception 'VALIDATION: document key'; end if;
 end loop;
 for item in select * from jsonb_array_elements(new.trigger_conditions)
 union all select f->'show_when' from jsonb_array_elements(new.client_fields) f where f ? 'show_when' and f->'show_when'<>'null' loop
  if jsonb_typeof(item) is distinct from 'object' or coalesce(item->>'field','')='' or coalesce(item->>'op','') not in ('exists','equals','not_equals','contains','gt','lt')
  or (item->>'op'<>'exists' and (not(item ? 'value') or item->'value'='null')) then raise exception 'VALIDATION: rule'; end if;
 end loop;
 return new;
end $$;
create trigger validate_service_input before insert or update on public.services for each row execute function public.validate_service_input();
commit;
