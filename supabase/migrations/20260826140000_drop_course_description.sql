-- Drop the deprecated Course description column.
-- Courses no longer carry descriptions; existing values are intentionally discarded.

ALTER TABLE "courses"
  DROP COLUMN IF EXISTS "description";