-- Restore the plain mirror index for the class-identity access path.
--
-- The unique NULLS NOT DISTINCT index (course_assignments_class_identity_key)
-- enforces one assignment per (term, course, program, year, section).
-- 20260826130300 dropped the plain non-unique mirror index that the Prisma
-- schema declares as @@index([term_instance_id, course_id, program_id,
-- year_level, section]). Recreate it so the database matches the Prisma
-- schema and schema diffs stay clean, per the convention used by
-- academic_term_instances and school_years (SQL-only constraint + plain
-- mirror index).
CREATE INDEX IF NOT EXISTS "course_assignments_term_instance_id_course_id_program_id_ye_idx"
  ON "course_assignments"("term_instance_id", "course_id", "program_id", "year_level", "section");
