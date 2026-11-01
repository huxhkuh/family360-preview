CREATE TABLE ai_jobs (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('document','brief')),
 family_id TEXT NOT NULL REFERENCES families(id),
 document_id TEXT REFERENCES documents(id),
 document_version_id TEXT REFERENCES document_versions(id),
 requested_by TEXT NOT NULL REFERENCES profiles(id),
 requested_role TEXT NOT NULL,
 fingerprint TEXT NOT NULL,
 input TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(input)),
 status TEXT NOT NULL CHECK(status IN ('queued','processing','review','ready','failed','stale')),
 result TEXT CHECK(result IS NULL OR json_valid(result)),
 error_code TEXT,
 attempts INTEGER NOT NULL DEFAULT 0,
 revision INTEGER NOT NULL DEFAULT 1,
 lease_token TEXT,
 lease_until TEXT,
 next_attempt_at TEXT,
 token_usage INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 UNIQUE(kind,family_id,fingerprint)
);
CREATE INDEX ai_jobs_pending ON ai_jobs(status,next_attempt_at,lease_until);
CREATE INDEX ai_jobs_document ON ai_jobs(document_id,created_at);
CREATE TABLE ai_field_reviews (
 job_id TEXT NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
 field_id TEXT NOT NULL,
 value TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('confirmed','rejected')),
 note TEXT NOT NULL DEFAULT '',
 reviewed_by TEXT NOT NULL REFERENCES profiles(id),
 reviewed_at TEXT NOT NULL,
 PRIMARY KEY(job_id,field_id)
);
