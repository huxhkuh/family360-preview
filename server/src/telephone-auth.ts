// These functions are server-side primitives, not an HTTP endpoint. The caller must
// authenticate the provider and authorize staff before exposing any operation.
const encoder = new TextEncoder();
const CODE_TTL = 5 * 60_000;
const SESSION_TTL = 10 * 60_000;
const ISSUE_COOLDOWN = 60_000;
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60_000;

export function normalizeTelephone(input: string): string {
  const digits = input.replace(/[\s()-]/g, '');
  if (/^0[2-9]\d{7,8}$/.test(digits)) return '+972' + digits.slice(1);
  if (/^\+972[2-9]\d{7,8}$/.test(digits)) return digits;
  throw new Error('INVALID_PHONE');
}

async function mac(secret: string, purpose: string, value: string): Promise<string> {
  if (encoder.encode(secret).length < 32) throw new Error('TELEPHONE_SECRET_REQUIRED');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${purpose}:${value}`)));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function randomCode(): string {
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= 4294000000);
  return String(value[0] % 1_000_000).padStart(6, '0');
}

/** Staff authorization and prior verification must be established by the caller. */
export async function createTelephoneBinding(db: D1Database, familyId: string, clientProfileId: string, phone: string, actorId: string): Promise<string> {
  const id = crypto.randomUUID();
  const result = await db.prepare(`INSERT INTO telephone_bindings(id,family_id,client_profile_id,phone,verified_by,verified_at)
    SELECT ?,f.id,p.id,?,?,? FROM families f JOIN profiles p ON p.id=f.client_profile_id
    WHERE f.id=? AND p.id=? AND p.active=1 AND p.role='client' RETURNING id`)
    .bind(id, normalizeTelephone(phone), actorId, new Date().toISOString(), familyId, clientProfileId).first();
  if (!result) throw new Error('INVALID_CLIENT_BINDING');
  return id;
}

/** Revoking a binding immediately makes its challenges and sessions unusable. */
export async function revokeTelephoneBinding(db: D1Database, bindingId: string): Promise<void> {
  await db.prepare('UPDATE telephone_bindings SET revoked_at=? WHERE id=? AND revoked_at IS NULL')
    .bind(new Date().toISOString(), bindingId).run();
}

/** The delivery implementation must only call the supplied verified number and must never log the code. */
export async function issueTelephoneCode(db: D1Database, phone: string, secret: string, deliver: (phone: string, code: string) => Promise<void>): Promise<boolean> {
  const normalized = normalizeTelephone(phone);
  const binding = await db.prepare(`SELECT b.id FROM telephone_bindings b JOIN families f ON f.id=b.family_id AND f.client_profile_id=b.client_profile_id
    JOIN profiles p ON p.id=b.client_profile_id AND p.active=1 AND p.role='client' WHERE b.phone=? AND b.revoked_at IS NULL`).bind(normalized).first<{id:string}>();
  if (!binding) return false;
  const code = randomCode(), challenge = crypto.randomUUID(), time = Date.now();
  const digest = await mac(secret, 'code', `${binding.id}:${challenge}:${code}`);
  // The conditional upsert atomically enforces cooldown even for parallel requests.
  const row = await db.prepare(`INSERT INTO telephone_challenges(binding_id,challenge_id,code_mac,expires_at,issued_at,attempts,consumed)
    SELECT ?,?,?,?,?,0,0 WHERE EXISTS(SELECT 1 FROM telephone_bindings WHERE id=? AND revoked_at IS NULL AND locked_until<=?)
    ON CONFLICT(binding_id) DO UPDATE SET challenge_id=excluded.challenge_id,code_mac=excluded.code_mac,
    expires_at=excluded.expires_at,issued_at=excluded.issued_at,attempts=0,consumed=0
    WHERE telephone_challenges.issued_at<=? RETURNING challenge_id`)
    .bind(binding.id, challenge, digest, time + CODE_TTL, time, binding.id, time, time - ISSUE_COOLDOWN).first();
  if (!row) return false;
  try { await deliver(normalized, code); }
  catch {
    await db.prepare('UPDATE telephone_challenges SET consumed=1 WHERE binding_id=? AND challenge_id=?').bind(binding.id, challenge).run();
    return false;
  }
  return true;
}

/** Returns a high-entropy opaque session token once; never store it in logs. */
export async function verifyTelephoneCode(db: D1Database, phone: string, code: string, secret: string): Promise<string | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const normalized = normalizeTelephone(phone), time = Date.now();
  // Count every eligible attempt atomically, including failures and concurrent calls.
  const challenge = await db.prepare(`UPDATE telephone_challenges SET attempts=attempts+1 WHERE binding_id=(SELECT b.id FROM telephone_bindings b JOIN families f ON f.id=b.family_id AND f.client_profile_id=b.client_profile_id JOIN profiles p ON p.id=b.client_profile_id AND p.active=1 AND p.role='client' WHERE b.phone=? AND b.revoked_at IS NULL)
    AND consumed=0 AND expires_at>? AND attempts<? RETURNING binding_id,challenge_id,code_mac`)
    .bind(normalized, time, MAX_ATTEMPTS).first<{binding_id:string;challenge_id:string;code_mac:string}>();
  if (!challenge) return null;
  // The cumulative limit survives issuance of new codes. The fifth attempt is
  // evaluated, but locks further issuance and attempts for 15 minutes if wrong.
  const attempt = await db.prepare(`UPDATE telephone_bindings SET
    failed_attempts=CASE WHEN locked_until>0 AND locked_until<=? THEN 1 ELSE failed_attempts+1 END,
    locked_until=CASE WHEN (CASE WHEN locked_until>0 AND locked_until<=? THEN 1 ELSE failed_attempts+1 END)>=? THEN ? ELSE 0 END
    WHERE id=? AND revoked_at IS NULL AND locked_until<=? RETURNING id`)
    .bind(time,time,MAX_ATTEMPTS,time+LOCK_TIME,challenge.binding_id,time).first();
  if (!attempt) return null;
  const digest = await mac(secret, 'code', `${challenge.binding_id}:${challenge.challenge_id}:${code}`);
  if (digest !== challenge.code_mac) return null;
  const consumed = await db.prepare('UPDATE telephone_challenges SET consumed=1 WHERE binding_id=? AND challenge_id=? AND consumed=0 AND expires_at>? RETURNING binding_id')
    .bind(challenge.binding_id, challenge.challenge_id, Date.now()).first();
  if (!consumed) return null;
  await db.prepare('UPDATE telephone_bindings SET failed_attempts=0,locked_until=0 WHERE id=?').bind(challenge.binding_id).run();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT INTO telephone_sessions(token_mac,binding_id,expires_at) VALUES(?,?,?)')
    .bind(await mac(secret, 'session', token), challenge.binding_id, Date.now() + SESSION_TTL).run();
  return token;
}

export async function resolveTelephoneSession(db: D1Database, token: string, secret: string): Promise<{familyId:string; bindingId:string; clientProfileId:string} | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await db.prepare(`SELECT b.family_id,b.id,b.client_profile_id FROM telephone_sessions s JOIN telephone_bindings b ON b.id=s.binding_id
    JOIN families f ON f.id=b.family_id AND f.client_profile_id=b.client_profile_id JOIN profiles p ON p.id=b.client_profile_id AND p.active=1 AND p.role='client'
    WHERE s.token_mac=? AND s.expires_at>? AND b.revoked_at IS NULL`).bind(await mac(secret, 'session', token), Date.now())
    .first<{family_id:string;id:string;client_profile_id:string}>();
  return row ? { familyId: row.family_id, bindingId: row.id, clientProfileId: row.client_profile_id } : null;
}
