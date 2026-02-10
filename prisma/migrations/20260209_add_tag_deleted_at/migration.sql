-- Add soft-delete support for tags
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
