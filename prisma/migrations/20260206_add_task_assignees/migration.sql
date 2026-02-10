-- Ensure junction table exists with constraints
CREATE TABLE IF NOT EXISTS "task_assignees" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("task_id","user_id")
);

-- Index for reverse lookup
CREATE INDEX IF NOT EXISTS "task_assignees_user_id_idx" ON "task_assignees"("user_id");

-- FKs (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_assignees_task_id_fkey'
  ) THEN
    ALTER TABLE "task_assignees"
      ADD CONSTRAINT "task_assignees_task_id_fkey"
      FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'task_assignees_user_id_fkey'
  ) THEN
    ALTER TABLE "task_assignees"
      ADD CONSTRAINT "task_assignees_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Backfill from legacy assignee_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'assignee_id'
  ) THEN
    INSERT INTO "task_assignees" ("task_id", "user_id", "created_at")
    SELECT t.id, t.assignee_id, COALESCE(t.updated_at, t.created_at, NOW())
    FROM tasks t
    WHERE t.assignee_id IS NOT NULL
    ON CONFLICT ("task_id","user_id") DO NOTHING;
  END IF;
END$$;
