-- #318 Part 1: SchoolYear active state
-- Adds is_active, active_semester, and semester-activation audit columns to school_years.

-- AlterTable
ALTER TABLE "school_years" ADD COLUMN     "active_semester" "academic_semester",
ADD COLUMN     "active_semester_activated_at" TIMESTAMP(3),
ADD COLUMN     "active_semester_activated_by" UUID,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false;

-- Mirror index (non-unique) for the is_active predicate; the real uniqueness is
-- enforced by the partial unique index below. Prisma cannot express partial indexes.
CREATE INDEX "school_years_is_active_idx" ON "school_years"("is_active");

-- AddForeignKey
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_active_semester_activated_by_fkey" FOREIGN KEY ("active_semester_activated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-added: at most one active School Year (partial unique index, Prisma cannot express)
CREATE UNIQUE INDEX "one_active_school_year" ON "school_years"("is_active") WHERE "is_active" = true;

-- Hand-added: an inactive School Year cannot retain an active semester
ALTER TABLE "school_years" ADD CONSTRAINT "school_years_active_semester_check" CHECK ("is_active" = true OR "active_semester" IS NULL);
