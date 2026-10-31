-- Phone bindings must only be created after staff verification.
CREATE TABLE telephone_bindings (
  id TEXT PRIMARY KEY, family_id TEXT NOT NULL REFERENCES families(id), client_profile_id TEXT NOT NULL REFERENCES profiles(id),
  phone TEXT NOT NULL, verified_by TEXT NOT NULL REFERENCES profiles(id),
  verified_at TEXT NOT NULL, revoked_at TEXT, failed_attempts INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX telephone_active_phone ON telephone_bindings(phone) WHERE revoked_at IS NULL;
CREATE TABLE telephone_challenges (
  binding_id TEXT PRIMARY KEY REFERENCES telephone_bindings(id), challenge_id TEXT NOT NULL,
  code_mac TEXT NOT NULL, expires_at INTEGER NOT NULL, issued_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE telephone_sessions (
  token_mac TEXT PRIMARY KEY, binding_id TEXT NOT NULL REFERENCES telephone_bindings(id), expires_at INTEGER NOT NULL
);
