-- Episode 04: projects, task priority/due date, and version metadata.
-- A new schema change = a new migration file. Never edit 001.
-- Runs in one transaction: either everything applies or nothing does.

BEGIN;

-- 1. Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX idx_projects_updated_at ON projects (updated_at);

-- 2. Existing tasks need a project: put them in a default "Inbox".
INSERT INTO projects (id, name)
VALUES ('00000000-0000-7000-8000-000000000001', 'Inbox');

ALTER TABLE tasks
    ADD COLUMN project_id UUID REFERENCES projects (id);

UPDATE tasks
SET project_id = '00000000-0000-7000-8000-000000000001'
WHERE project_id IS NULL;

ALTER TABLE tasks
    ALTER COLUMN project_id SET NOT NULL;

CREATE INDEX idx_tasks_project_id ON tasks (project_id);

-- 3. New task fields + the same rules the app enforces with Zod
ALTER TABLE tasks
    ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    ADD COLUMN due_at TIMESTAMPTZ,
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    ADD CONSTRAINT tasks_title_length
        CHECK (char_length(title) BETWEEN 1 AND 200);

COMMIT;
