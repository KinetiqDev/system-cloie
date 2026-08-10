-- AlterTable
ALTER TABLE "course_assignments" ADD COLUMN     "curriculum_course_id" UUID;

-- CreateIndex
CREATE INDEX "course_assignments_curriculum_course_id_idx" ON "course_assignments"("curriculum_course_id");

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_curriculum_course_id_fkey" FOREIGN KEY ("curriculum_course_id") REFERENCES "curriculum_courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
