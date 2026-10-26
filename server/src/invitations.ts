import {z} from 'zod';
import {Context,parse,idSchema} from './context';
import {admin} from './auth';
import {now,uuid,requireThat,type Row} from './db';
async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
export const invitationOperations=['rpc_create_agent_invitation','rpc_list_agent_invitations','rpc_revoke_agent_invitation','rpc_accept_agent_invitation','rpc_open_client_case'];
export async function invitations(c:Context,name:string,a:Row):Promise<unknown>{
 if(name==='rpc_open_client_case'){
  requireThat(c.actor.profile.role==='client');const old=(await c.db.rows('families','client_profile_id=?',[c.actor.profile.id]))[0];if(old)return old;
  const p=parse(z.object({p_name:z.string().trim().min(2).max(150),p_phone:z.string().min(9).max(40),p_referral_code:z.string().max(50).optional()}),a);const id=uuid();const family=c.insert('families',{id,case_number:'F-'+id.slice(0,8).toUpperCase(),client_profile_id:c.actor.profile.id,name:p.p_name,contact_name:p.p_name,phone:p.p_phone,email:c.actor.email,created_at:now(),updated_at:now()});
  if(p.p_referral_code){const partner=(await c.db.rows('partners','code=? AND active=1',[p.p_referral_code]))[0];if(partner)c.insert('referrals',{id:uuid(),public_id:uuid(),family_id:id,partner_id:partner.id,registered_at:now(),status:'registered'});}
  return family;
 }
 if(name==='rpc_accept_agent_invitation'){
  const token=parse(z.string().regex(/^[a-f0-9]{64}$/),a.p_token);const invite=(await c.db.rows('agent_invitations','token_hash=?',[await digest(token)]))[0];requireThat(invite&&!invite.revoked_at&&!invite.accepted_at&&Date.parse(invite.expires_at)>Date.now()&&(!invite.email||invite.email.toLowerCase()===c.actor.email.toLowerCase()),'INVITE_INVALID',400);
  requireThat(c.actor.profile.role==='client'&&!(await c.db.rows('families','client_profile_id=?',[c.actor.profile.id])).length,'INVITE_ACCOUNT_CONFLICT',409);
  const creator=await c.db.required('profiles',invite.created_by);requireThat(creator.active&&creator.role==='admin','INVITE_INVALID',400);
  c.patch('profiles',c.actor.profile,{role:'representative',invited_by:invite.created_by,agent_invitation_id:invite.id,joined_as_agent_at:now()});c.insert('representatives',{id:uuid(),profile_id:c.actor.profile.id,active:true,permissions:['families.edit']});c.patch('agent_invitations',invite,{accepted_at:now(),accepted_by:c.actor.profile.id});return null;
 }
 admin(c.actor);
 if(name==='rpc_list_agent_invitations')return (await c.db.rows('agent_invitations','1=1',[],'ORDER BY created_at DESC LIMIT 200')).map(({token_hash,accepted_by,...row})=>({...row,accepted_name:accepted_by?'חשבון מאומת':null}));
 if(name==='rpc_revoke_agent_invitation'){const row=await c.db.required('agent_invitations',a.p_invitation_id);requireThat(!row.accepted_at,'INVALID_STATE',409);return c.patch('agent_invitations',row,{revoked_at:now()});}
 const p=parse(z.object({p_label:z.string().trim().min(2).max(150),p_email:z.email().nullable().optional()}),a);const today=now().slice(0,10);requireThat((await c.db.rows('agent_invitations','created_by=? AND created_at>=?',[c.actor.profile.id,today])).length<50,'INVITE_LIMIT',429);
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');const expires_at=new Date(Date.now()+7*86400000).toISOString();c.insert('agent_invitations',{id:uuid(),token_hash:await digest(token),label:p.p_label,email:p.p_email?.toLowerCase()||null,created_by:c.actor.profile.id,created_at:now(),expires_at});return {token,expires_at};
}
