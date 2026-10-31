CREATE TABLE telephone_messages (
 id TEXT PRIMARY KEY,
 family_id TEXT NOT NULL REFERENCES families(id),
 source_event TEXT NOT NULL UNIQUE,
 object_key TEXT NOT NULL UNIQUE,
 duration_seconds REAL NOT NULL CHECK(duration_seconds > 0 AND duration_seconds <= 120),
 created_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','handled')),
 handled_at TEXT,
 handled_by TEXT REFERENCES profiles(id)
);
CREATE INDEX telephone_messages_family ON telephone_messages(family_id, status, created_at);
