-- Consolidate superseded term-linking snapshots into one ordered migration.
-- The older snapshots are retained for migration-history compatibility, but are
-- repaired as applied on fresh targets after this migration supplies their work.

ALTER TABLE "course_bound_evaluations"
  ADD COLUMN IF NOT EXISTS "course_assignment_id" UUID,
  ADD COLUMN IF NOT EXISTS "term_instance_id" UUID;

ALTER TABLE "central_deployments"
  ADD COLUMN IF NOT EXISTS "term" "academic_term",
  ADD COLUMN IF NOT EXISTS "term_instance_id" UUID;

ALTER TABLE "faculty_program_affiliations"
  ADD COLUMN IF NOT EXISTS "is_primary" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "central_deployments_term_instance_id_idx"
  ON "central_deployments"("term_instance_id");
CREATE INDEX IF NOT EXISTS "course_bound_evaluations_term_instance_id_idx"
  ON "course_bound_evaluations"("term_instance_id");
CREATE INDEX IF NOT EXISTS "course_bound_evaluations_course_assignment_id_idx"
  ON "course_bound_evaluations"("course_assignment_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_bound_evaluations_term_instance_id_fkey'
  ) THEN
    ALTER TABLE "course_bound_evaluations"
      ADD CONSTRAINT "course_bound_evaluations_term_instance_id_fkey"
      FOREIGN KEY ("term_instance_id") REFERENCES "academic_term_instances"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_bound_evaluations_course_assignment_id_fkey'
  ) THEN
    ALTER TABLE "course_bound_evaluations"
      ADD CONSTRAINT "course_bound_evaluations_course_assignment_id_fkey"
      FOREIGN KEY ("course_assignment_id") REFERENCES "course_assignments"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'central_deployments_term_instance_id_fkey'
  ) THEN
    ALTER TABLE "central_deployments"
      ADD CONSTRAINT "central_deployments_term_instance_id_fkey"
      FOREIGN KEY ("term_instance_id") REFERENCES "academic_term_instances"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill while the legacy source columns still exist. Empty new targets take
-- the no-op path; existing data must resolve before legacy columns are dropped.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'course_bound_evaluations'
      AND column_name = 'academic_year'
  ) THEN
    UPDATE "course_bound_evaluations" cbe
    SET "term_instance_id" = ti.id
    FROM "academic_term_instances" ti
    JOIN "school_years" sy ON ti."school_year_id" = sy.id
    WHERE cbe."term_instance_id" IS NULL
      AND cbe."academic_year" IS NOT NULL
      AND cbe."semester" IS NOT NULL
      AND sy."code" = cbe."academic_year"
      AND ti."semester"::text = cbe."semester"::text
      AND (
        (cbe."term" IS NULL AND ti."term" IS NULL)
        OR cbe."term"::text = ti."term"::text
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'central_deployments'
      AND column_name = 'academic_year'
  ) THEN
    UPDATE "central_deployments" cd
    SET "term_instance_id" = ti.term_instance_id
    FROM (
      SELECT DISTINCT ON (sy."code", ti."semester")
        sy."code" AS school_year_code,
        ti."semester",
        ti.id AS term_instance_id
      FROM "academic_term_instances" ti
      JOIN "school_years" sy ON ti."school_year_id" = sy.id
      ORDER BY sy."code", ti."semester", ti."term" NULLS FIRST
    ) ti
    WHERE cd."term_instance_id" IS NULL
      AND cd."academic_year" IS NOT NULL
      AND cd."semester" IS NOT NULL
      AND ti.school_year_code = cd."academic_year"
      AND ti."semester"::text = cd."semester"::text;
  END IF;
END $$;

DO $$
DECLARE
  cbe_missing integer;
  cd_missing integer;
BEGIN
  SELECT COUNT(*) INTO cbe_missing
  FROM "course_bound_evaluations"
  WHERE "term_instance_id" IS NULL;
  SELECT COUNT(*) INTO cd_missing
  FROM "central_deployments"
  WHERE "term_instance_id" IS NULL;

  IF cbe_missing > 0 OR cd_missing > 0 THEN
    RAISE EXCEPTION
      'Cannot finalize term links: % course_bound_evaluations and % central_deployments rows remain unresolved',
      cbe_missing, cd_missing;
  END IF;
END $$;

ALTER TABLE "course_bound_evaluations"
  ALTER COLUMN "term_instance_id" SET NOT NULL;
ALTER TABLE "central_deployments"
  ALTER COLUMN "term_instance_id" SET NOT NULL;

ALTER TABLE "course_bound_evaluations"
  DROP COLUMN IF EXISTS "academic_year",
  DROP COLUMN IF EXISTS "semester",
  DROP COLUMN IF EXISTS "term";
ALTER TABLE "central_deployments"
  DROP COLUMN IF EXISTS "academic_year",
  DROP COLUMN IF EXISTS "semester";
ALTER TABLE "student_academic_profiles"
  DROP COLUMN IF EXISTS "academic_year",
  DROP COLUMN IF EXISTS "year_level",
  DROP COLUMN IF EXISTS "section";
