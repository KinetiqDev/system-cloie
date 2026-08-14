-- #375: version the Academic Period readiness snapshots.
--
-- Existing snapshots predate the typed Institutional Outcome model and keep
-- their legacy interpretation (version 1). The application writes new
-- snapshots with schema version 2 carrying typed target payloads.
--
-- The immutable trigger is untouched: UPDATE and DELETE remain blocked, and
-- existing rows keep version 1 through the column default.

BEGIN;

ALTER TABLE "academic_period_readiness_snapshots"
  ADD COLUMN IF NOT EXISTS "schema_version" INTEGER NOT NULL DEFAULT 1;

COMMIT;
