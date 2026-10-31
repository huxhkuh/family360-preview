import {familyAccess, type Actor, type Env} from './auth';
import {ApiError, Database, now, requireThat, uuid, type Row} from './db';

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_SECONDS = 120;
/** Accept only uncompressed PCM WAV with a well-formed format and bounded duration. */
export function validateVoiceMessage(bytes: Uint8Array): number {
 requireThat(bytes.length >= 44 && bytes.length <= MAX_BYTES, 'FILE_SIZE', 413);
 const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 const tag = (i: number) => String.fromCharCode(...bytes.subarray(i, i + 4));
 requireThat(tag(0) === 'RIFF' && tag(8) === 'WAVE' && view.getUint32(4, true) + 8 === bytes.length, 'FILE_TYPE', 400);
 let offset = 12, byteRate = 0, dataSize = -1, formats = 0, dataChunks = 0;
 while (offset + 8 <= bytes.length) {
  const kind = tag(offset), size = view.getUint32(offset + 4, true), start = offset + 8;
  requireThat(start + size <= bytes.length, 'FILE_TYPE', 400);
  if (kind === 'fmt ') {
   formats++; requireThat(size >= 16, 'FILE_TYPE', 400);
   const channels = view.getUint16(start + 2, true), rate = view.getUint32(start + 4, true), bits = view.getUint16(start + 14, true);
   const block = view.getUint16(start + 12, true); byteRate = view.getUint32(start + 8, true);
   requireThat(view.getUint16(start, true) === 1 && channels >= 1 && channels <= 2 && rate >= 8000 && rate <= 48000 && (bits === 8 || bits === 16) && block === channels * bits / 8 && byteRate === rate * block, 'FILE_TYPE', 400);
  }
  if (kind === 'data') { dataChunks++; dataSize = size; }
  offset = start + size + (size % 2);
 }
 requireThat(offset === bytes.length && formats === 1 && dataChunks === 1 && byteRate > 0 && dataSize > 0, 'FILE_TYPE', 400);
 const duration = dataSize / byteRate;
 requireThat(duration <= MAX_SECONDS, 'FILE_SIZE', 413);
 return duration;
}

/** Caller must have already authenticated the provider AND a live verified telephone session for familyId. */
export async function storeVoiceMessage(db: Database, env: Env, familyId: string, sourceEvent: string, bytes: Uint8Array) {
 requireThat(typeof sourceEvent === 'string' && /^[A-Za-z0-9:_-]{1,150}$/.test(sourceEvent), 'VALIDATION', 400);
 await db.required('families', familyId);
 const duration = validateVoiceMessage(bytes);
 const existing = await db.statement('SELECT id, family_id FROM telephone_messages WHERE source_event=?', [sourceEvent]).first<Row>();
 if (existing) { requireThat(existing.family_id === familyId); return {id: existing.id}; }
 const id = uuid(), key = `telephone-messages/${familyId}/${id}`;
 await env.DOCUMENTS.put(key, bytes, {httpMetadata: {contentType: 'audio/wav', cacheControl: 'private, no-store'}});
 try {
  const createdAt = now(), assertion = uuid();
  // All statements share a D1 transaction: a reassignment or deactivation cannot
  // occur between recipient verification, storing the message and notification.
  await db.binding.batch([
   db.statement("INSERT INTO telephone_messages(id,family_id,source_event,object_key,duration_seconds,created_at) SELECT ?,f.id,?,?,?,? FROM families f JOIN representatives r ON r.id=f.representative_id JOIN profiles p ON p.id=r.profile_id WHERE f.id=? AND r.active=1 AND p.active=1 AND p.role='representative'", [id,sourceEvent,key,duration,createdAt,familyId]),
   db.statement('INSERT INTO transaction_assertions(id,valid) VALUES (?,CASE WHEN changes()=1 THEN 1 ELSE 0 END)', [assertion]),
   db.statement("INSERT INTO notifications(id,profile_id,family_id,title,created_at) SELECT ?,r.profile_id,f.id,'התקבלה הודעה קולית מלקוח',? FROM families f JOIN representatives r ON r.id=f.representative_id JOIN profiles p ON p.id=r.profile_id WHERE f.id=? AND r.active=1 AND p.active=1 AND p.role='representative'", [uuid(),createdAt,familyId]),
   db.statement('DELETE FROM transaction_assertions WHERE id=?', [assertion])
  ]);
  return {id};
 } catch (error) {
  await env.DOCUMENTS.delete(key);
  const duplicate = await db.statement('SELECT id, family_id FROM telephone_messages WHERE source_event=?', [sourceEvent]).first<Row>();
  if (duplicate) { requireThat(duplicate.family_id === familyId); return {id:duplicate.id}; }
  const recipient = await db.statement("SELECT r.id FROM families f JOIN representatives r ON r.id=f.representative_id JOIN profiles p ON p.id=r.profile_id WHERE f.id=? AND r.active=1 AND p.active=1 AND p.role='representative'", [familyId]).first();
  if (!recipient) throw new ApiError('NO_ACTIVE_REPRESENTATIVE', 409);
  throw error;
 }
}
async function staffAccess(db: Database, actor: Actor, familyId: string) {
 requireThat(actor.profile.role === 'admin' || actor.profile.role === 'representative');
 await familyAccess(db, actor, familyId, 'families.edit');
}
export async function listVoiceMessages(db: Database, actor: Actor, familyId: string) {
 await staffAccess(db, actor, familyId);
 return (await db.statement('SELECT id,family_id,created_at,status,handled_at FROM telephone_messages WHERE family_id=? ORDER BY created_at DESC LIMIT 100', [familyId]).all<Row>()).results;
}
async function getAuthorized(db: Database, actor: Actor, id: string) {
 requireThat(typeof id === 'string' && id.length <= 150, 'VALIDATION', 400);
 const message = await db.statement('SELECT * FROM telephone_messages WHERE id=?', [id]).first<Row>();
 requireThat(message, 'NOT_FOUND', 404);
 await staffAccess(db, actor, message.family_id);
 return message;
}
export async function listenVoiceMessage(db: Database, actor: Actor, env: Env, id: string) {
 const message = await getAuthorized(db, actor, id);
 const object = await env.DOCUMENTS.get(message.object_key);
 requireThat(object, 'NOT_FOUND', 404);
 await db.commit(await db.version(), actor.profile, 'listen', 'telephone_message', id, []);
 return new Response(object.body as any, {headers:{'Content-Type':'audio/wav','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export async function handleVoiceMessage(db: Database, actor: Actor, id: string) {
 const message = await getAuthorized(db, actor, id);
 if (message.status === 'handled') return {id, status:'handled'};
 await db.commit(await db.version(), actor.profile, 'handle', 'telephone_message', id, [db.statement("UPDATE telephone_messages SET status='handled',handled_at=?,handled_by=? WHERE id=? AND status='open'", [now(),actor.profile.id,id])]);
 return {id, status:'handled'};
}
