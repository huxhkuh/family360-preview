begin;
-- Invite capabilities are stored only as SHA-256 hashes in a non-exposed schema.
create table f360.agent_invitations (
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique,
 label text not null check(length(label) between 2 and 150),
 email text,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 revoked_at timestamptz,
 accepted_at timestamptz,
 accepted_by uuid references public.profiles(id)
);
revoke all on f360.agent_invitations from public,anon,authenticated;
alter table public.profiles
 add column agent_invitation_id uuid references f360.agent_invitations(id),
 add column invited_by uuid references public.profiles(id),
 add column joined_as_agent_at timestamptz;

create function public.rpc_create_agent_invitation(p_label text,p_email text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session(); token text; invitation f360.agent_invitations%rowtype;
begin
 if not public.is_admin() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 if length(trim(coalesce(p_label,''))) not between 2 and 150
 or (nullif(trim(p_email),'') is not null and (length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then raise exception 'VALIDATION: invitation'; end if;
 -- Serialize issuance by administrator to make this local quota race-safe.
 perform 1 from public.profiles where id=pid for update;
 if (select count(*) from f360.agent_invitations where created_by=pid and created_at>now()-interval '1 day')>=100 then raise exception 'INVITE_LIMIT'; end if;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into f360.agent_invitations(token_hash,label,email,created_by)
 values(encode(sha256(convert_to(token,'UTF8')),'hex'),trim(p_label),lower(nullif(trim(p_email),'')),pid) returning * into invitation;
 perform public.write_audit('create','agent_invitation',invitation.id,invitation.label,'One-time agent invitation created');
 return jsonb_build_object('id',invitation.id,'token',token,'expires_at',invitation.expires_at);
end $$;

create function public.rpc_list_agent_invitations()
returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 perform public.require_session();
 if not public.is_admin() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(i) order by created_at desc) from (
 select i.id,i.label,i.email,i.created_at,i.expires_at,i.revoked_at,i.accepted_at,i.accepted_by,p.name accepted_name
 from f360.agent_invitations i left join public.profiles p on p.id=i.accepted_by
 order by i.created_at desc limit 200)i),'[]');
end $$;

create function public.rpc_revoke_agent_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.require_session();
 if not public.is_admin() then raise exception 'PERMISSION_DENIED' using errcode='42501'; end if;
 update f360.agent_invitations set revoked_at=coalesce(revoked_at,now()) where id=p_invitation_id and accepted_at is null;
 if not found then raise exception 'INVALID_STATE: invitation missing or already consumed'; end if;
 perform public.write_audit('revoke','agent_invitation',p_invitation_id,'','Agent invitation revoked');
end $$;

create function public.rpc_accept_agent_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pid uuid:=public.require_session(); p public.profiles%rowtype; i f360.agent_invitations%rowtype; verified_email text;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'INVITE_INVALID'; end if;
 select * into p from public.profiles where id=pid for update;
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'EMAIL_NOT_VERIFIED'; end if;
 select * into i from f360.agent_invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if i.id is null or i.revoked_at is not null or i.expires_at<=now()
 or (i.email is not null and i.email<>verified_email)
 or not exists(select 1 from public.profiles where id=i.created_by and role='admin' and active) then raise exception 'INVITE_INVALID'; end if;
 if i.accepted_at is not null then
  -- Network retry is idempotent, but an old link can never restore revoked roles.
  if i.accepted_by=pid and p.role='representative' and p.agent_invitation_id=i.id then
   return jsonb_build_object('id',pid,'role',p.role);
  end if;
  raise exception 'INVITE_INVALID';
 end if;
 if p.role<>'client' or p.agent_invitation_id is not null
 or exists(select 1 from public.families where client_profile_id=pid)
 or exists(select 1 from public.representatives where profile_id=pid)
 or exists(select 1 from public.professionals where profile_id=pid) then raise exception 'INVITE_ACCOUNT_CONFLICT'; end if;
 update public.profiles set role='representative',agent_invitation_id=i.id,invited_by=i.created_by,joined_as_agent_at=now() where id=pid;
 insert into public.representatives(profile_id,permissions) values(pid,'["families.edit"]');
 update f360.agent_invitations set accepted_by=pid,accepted_at=now() where id=i.id;
 perform public.write_audit('accept','agent_invitation',i.id,i.label,'Verified user joined as agent',jsonb_build_object('profile_id',pid,'invited_by',i.created_by));
 return jsonb_build_object('id',pid,'role','representative');
end $$;

-- Post-0010 RPCs explicitly enforce sessions and grants; no PUBLIC default access.
revoke all on function public.rpc_create_agent_invitation(text,text),public.rpc_list_agent_invitations(),public.rpc_revoke_agent_invitation(uuid),public.rpc_accept_agent_invitation(text) from public,anon,authenticated;
grant execute on function public.rpc_create_agent_invitation(text,text),public.rpc_list_agent_invitations(),public.rpc_revoke_agent_invitation(uuid),public.rpc_accept_agent_invitation(text) to authenticated;
commit;
