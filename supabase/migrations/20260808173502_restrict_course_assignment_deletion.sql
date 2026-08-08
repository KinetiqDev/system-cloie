-- #318 Part 2: course_assignments.course_id FK CASCADE -> RESTRICT
-- Defense-in-depth against historical data loss when deleting a course.

-- Hand-added: pre-flight orphan check. Fail before altering the constraint if any
-- course_assignment references a missing course (would block the FK change anyway).
DO $$
DECLARE
  orphan_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "course_assignments"
  WHERE "course_id" NOT IN (SELECT "id" FROM "courses");

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Aborting: % orphaned course_assignments row(s) reference non-existent courses', orphan_count;
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "course_assignments" DROP CONSTRAINT "course_assignments_course_id_fkey";

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
