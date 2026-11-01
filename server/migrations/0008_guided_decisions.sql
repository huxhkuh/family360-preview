CREATE TABLE guided_decisions (
 id TEXT PRIMARY KEY,
 meeting_id TEXT NOT NULL REFERENCES meetings(id),
 family_id TEXT NOT NULL REFERENCES families(id),
 topic_key TEXT NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN ('progress','thinking','declined','no_action','not_relevant')),
 note TEXT NOT NULL DEFAULT '',
 revision INTEGER NOT NULL DEFAULT 1,
 task_id TEXT,
 task_kind TEXT CHECK(task_kind IN ('analysis','execution','followup')),
 handoff TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL,
 UNIQUE(meeting_id,topic_key)
);
CREATE INDEX guided_decisions_family ON guided_decisions(family_id,meeting_id);
