-- Enforce class identity: one Faculty Member per (term, course, program, year, section).
-- NULLS NOT DISTINCT ensures section equality for unique enforcement.
-- Also adds CILO.is_active for soft archive/restore.

BEGIN;

-- DropIndex
DROP INDEX IF EXISTS "course_assignments_term_instance_id_course_id_faculty_id_pr_idx";

-- AlterTable: add soft archive column to cilos
ALTER TABLE "cilos" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Development fixtures are disposable. Keep one assignment per class identity and
-- remove only duplicate rows plus evaluations that reference those rows.
WITH duplicate_assignments AS (
  SELECT "id"
  FROM (
    SELECT "id", ROW_NUMBER() OVER (
      PARTITION BY "term_instance_id", "course_id", "program_id", "year_level", "section"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS row_number
    FROM "course_assignments"
  ) ranked
  WHERE row_number > 1
), deleted_evaluations AS (
  DELETE FROM "course_bound_evaluations"
  WHERE "course_assignment_id" IN (SELECT "id" FROM duplicate_assignments)
)
DELETE FROM "course_assignments"
WHERE "id" IN (SELECT "id" FROM duplicate_assignments);

-- CreateIndex: unique constraint for class identity (without faculty_id)
-- NULLS NOT DISTINCT ensures section = NULL is treated as equal for uniqueness
CREATE UNIQUE INDEX "course_assignments_class_identity_key"
  ON "course_assignments"("term_instance_id", "course_id", "program_id", "year_level", "section")
  NULLS NOT DISTINCT;

COMMIT;
