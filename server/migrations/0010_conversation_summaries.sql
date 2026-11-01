CREATE TABLE meeting_summaries (
 id TEXT PRIMARY KEY,
 meeting_id TEXT NOT NULL UNIQUE REFERENCES meetings(id),
 family_id TEXT NOT NULL REFERENCES families(id),
 revision INTEGER NOT NULL CHECK(revision>0),
 status TEXT NOT NULL CHECK(status IN ('draft','shared')),
 source TEXT NOT NULL CHECK(json_valid(source)),
 content TEXT NOT NULL CHECK(json_valid(content)),
 snapshot TEXT CHECK(snapshot IS NULL OR json_valid(snapshot)),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX meeting_summaries_family ON meeting_summaries(family_id,updated_at);
CREATE TABLE meeting_summary_history (
 id TEXT PRIMARY KEY,
 summary_id TEXT NOT NULL REFERENCES meeting_summaries(id),
 revision INTEGER NOT NULL,
 snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),
 UNIQUE(summary_id,revision)
);
