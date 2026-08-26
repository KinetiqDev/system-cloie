-- Restore class identity unique constraint dropped by 20260826130100
-- That migration dropped course_assignments_class_identity_key as part of drift reconciliation
-- but failed to recreate it, leaving the disposable DB without the unique enforcement.
-- This restores the unique index that enforces one assignment per (term, course, program, year, section).
CREATE UNIQUE INDEX IF NOT EXISTS "course_assignments_class_identity_key"
  ON "course_assignments"("term_instance_id", "course_id", "program_id", "year_level", "section")
  NULLS NOT DISTINCT;
