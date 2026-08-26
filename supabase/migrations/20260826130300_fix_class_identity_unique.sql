-- Fix drift reconciliation that dropped the class identity unique constraint.
-- 20260826130100 dropped the unique index `course_assignments_class_identity_key`
-- and created a plain (non-unique) index. Restore the unique constraint with
-- NULLS NOT DISTINCT so duplicate class creation is rejected as the domain
-- invariant and existing DB test require.

DROP INDEX IF EXISTS "course_assignments_term_instance_id_course_id_program_id_ye_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "course_assignments_class_identity_key"
  ON "course_assignments"("term_instance_id", "course_id", "program_id", "year_level", "section")
  NULLS NOT DISTINCT;
