-- Phase 2: Student Enrollment Ledger
-- academic_term_instances is created by the preceding calendar migration.

-- CreateEnum
CREATE TYPE "enrollment_source" AS ENUM ('ONBOARDING', 'ROLLOVER', 'ADMIN');

-- CreateTable
CREATE TABLE "student_enrollments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "student_user_id" UUID NOT NULL,
    "term_instance_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "major_id" UUID,
    "year_level" "year_level" NOT NULL,
    "section" "student_section",
    "source" "enrollment_source" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_enrollments_term_instance_id_program_id_year_level__idx"
  ON "student_enrollments"("term_instance_id", "program_id", "year_level", "section");

CREATE INDEX "student_enrollments_is_active_idx"
  ON "student_enrollments"("is_active");

CREATE UNIQUE INDEX "student_enrollments_student_user_id_term_instance_id_key"
  ON "student_enrollments"("student_user_id", "term_instance_id");

-- AddForeignKey
ALTER TABLE "student_enrollments"
  ADD CONSTRAINT "student_enrollments_student_user_id_fkey"
  FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_enrollments"
  ADD CONSTRAINT "student_enrollments_term_instance_id_fkey"
  FOREIGN KEY ("term_instance_id") REFERENCES "academic_term_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_enrollments"
  ADD CONSTRAINT "student_enrollments_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_enrollments"
  ADD CONSTRAINT "student_enrollments_major_id_fkey"
  FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_enrollments"
  ADD CONSTRAINT "student_enrollments_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
