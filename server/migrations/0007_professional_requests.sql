CREATE TABLE professional_requests (
 id TEXT PRIMARY KEY,
 task_kind TEXT NOT NULL CHECK(task_kind IN ('analysis','execution')),
 task_id TEXT NOT NULL,
 family_id TEXT NOT NULL REFERENCES families(id),
 professional_id TEXT NOT NULL REFERENCES professionals(id),
 category TEXT NOT NULL CHECK(category IN ('document','answer','instruction')),
 details TEXT NOT NULL,
 response TEXT NOT NULL DEFAULT '',
 representative_task_id TEXT NOT NULL UNIQUE REFERENCES family_tasks(id),
 created_at TEXT NOT NULL
);
CREATE INDEX professional_requests_task ON professional_requests(task_kind,task_id,created_at);
