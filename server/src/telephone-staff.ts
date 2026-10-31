import {familyAccess, type Actor} from './auth';
import {Database, now, requireThat, uuid, type Row} from './db';
import {normalizeTelephone} from './telephone-auth';
import {handleVoiceMessage, listVoiceMessages} from './telephone-messages';

export const telephoneStaffOperations = ['rpc_list_telephone_bindings','rpc_create_telephone_binding','rpc_revoke_telephone_binding','rpc_list_telephone_messages','rpc_mark_telephone_message_handled'];

export async function telephoneStaff(db: Database, actor: Actor, version: number, name: string, args: Row) {
 const family = await familyAccess(db, actor, args.p_family_id, 'families.edit');
 if (name === 'rpc_list_telephone_bindings') {
  return (await db.statement('SELECT id,phone,verified_at AS created_at FROM telephone_bindings WHERE family_id=? AND revoked_at IS NULL ORDER BY verified_at DESC', [family.id]).all<Row>()).results;
 }
 if (name === 'rpc_list_telephone_messages') return listVoiceMessages(db, actor, family.id);
 if (name === 'rpc_mark_telephone_message_handled') {
  requireThat(typeof args.p_id === 'string' && args.p_id.length <= 150, 'VALIDATION', 400);
  const message = await db.statement('SELECT id FROM telephone_messages WHERE id=? AND family_id=?', [args.p_id, family.id]).first();
  requireThat(message, 'NOT_FOUND', 404);
  return handleVoiceMessage(db, actor, args.p_id);
 }
 if (name === 'rpc_create_telephone_binding') {
  requireThat(args.p_verified === true && typeof args.p_phone === 'string' && args.p_phone.length <= 40, 'VALIDATION', 400);
  let phone: string; try { phone = normalizeTelephone(args.p_phone); } catch { requireThat(false, 'VALIDATION', 400); }
  let clientId = family.client_profile_id as string | null;
  const statements: D1PreparedStatement[] = [];
  if (clientId) {
   const client = await db.required('profiles', clientId);
   requireThat(client.active && client.role === 'client', 'INVALID_STATE', 409);
  } else {
   clientId = uuid();
   statements.push(db.insert('profiles', {id:clientId, role:'client', name:family.contact_name || family.name, active:true}));
   statements.push(db.statement('UPDATE families SET client_profile_id=?,updated_at=? WHERE id=? AND client_profile_id IS NULL', [clientId,now(),family.id]));
  }
  const id = uuid();
  statements.push(db.statement('INSERT INTO telephone_bindings(id,family_id,client_profile_id,phone,verified_by,verified_at) VALUES (?,?,?,?,?,?)', [id,family.id,clientId,phone,actor.profile.id,now()]));
  await db.commit(version, actor.profile, name, 'telephone_binding', id, statements);
  return {id};
 }
 if (name === 'rpc_revoke_telephone_binding') {
  requireThat(typeof args.p_id === 'string' && args.p_id.length <= 150, 'VALIDATION', 400);
  const binding = await db.statement('SELECT id FROM telephone_bindings WHERE id=? AND family_id=? AND revoked_at IS NULL', [args.p_id,family.id]).first();
  requireThat(binding, 'NOT_FOUND', 404);
  await db.commit(version, actor.profile, name, 'telephone_binding', args.p_id, [db.statement('UPDATE telephone_bindings SET revoked_at=? WHERE id=? AND family_id=? AND revoked_at IS NULL', [now(),args.p_id,family.id])]);
  return {id:args.p_id};
 }
 requireThat(false, 'UNKNOWN_OPERATION', 404);
}
