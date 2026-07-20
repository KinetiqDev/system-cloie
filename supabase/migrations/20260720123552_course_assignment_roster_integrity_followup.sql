-- Preserve roster history when a Faculty account is deleted. Assignment deletion
-- remains an explicit, separately authorized operation.
ALTER TABLE "course_assignments"
  DROP CONSTRAINT IF EXISTS "course_assignments_faculty_id_fkey";

ALTER TABLE "course_assignments"
  ADD CONSTRAINT "course_assignments_faculty_id_fkey"
  FOREIGN KEY ("faculty_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot express these partial unique indexes, but keeps the matching
-- non-unique access paths for respondent lookup and query planning.
CREATE INDEX IF NOT EXISTS "evaluation_assignments_course_bound_id_respondent_id_idx"
  ON "evaluation_assignments"("course_bound_id", "respondent_id");

CREATE INDEX IF NOT EXISTS "evaluation_assignments_central_deployment_id_respondent_id_idx"
  ON "evaluation_assignments"("central_deployment_id", "respondent_id");
