-- Drop the deprecated Program description column.
-- Programs no longer carry descriptions; existing values are intentionally discarded.

ALTER TABLE "programs"
  DROP COLUMN IF EXISTS "description";
