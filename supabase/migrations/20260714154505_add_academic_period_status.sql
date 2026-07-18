-- Slice 1: replace AcademicTermInstance.is_active with status lifecycle
-- Background: academic_term_instances carried a boolean is_active. Slice 1 swaps it
-- for an explicit status enum (PLANNED, ACTIVE, COMPLETED, CANCELLED) and re-anchors
-- the one-active enforcement on the new column.

-- CreateEnum
CREATE TYPE "academic_period_status" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- Drop old one-active partial unique index and helper index on is_active
DROP INDEX IF EXISTS "one_active_term_instance";
DROP INDEX "academic_term_instances_is_active_idx";

-- Add status with PLANNED default (the safe non-terminal default; backfill below
-- promotes the historically active record to ACTIVE before the column drop).
ALTER TABLE "academic_term_instances" ADD COLUMN "status" "academic_period_status" NOT NULL DEFAULT 'PLANNED';

-- Backfill status from is_active so the single pre-existing active record becomes ACTIVE
UPDATE "academic_term_instances"
SET "status" = 'ACTIVE'
WHERE "is_active" = true;

-- Drop is_active now that the lifecycle state is captured in status
ALTER TABLE "academic_term_instances" DROP COLUMN "is_active";

-- CreateIndex
CREATE INDEX "academic_term_instances_status_idx" ON "academic_term_instances"("status");

-- Re-anchor the one-active partial unique index on the new status column
CREATE UNIQUE INDEX "one_active_academic_period" ON "academic_term_instances"("status")
WHERE "status" = 'ACTIVE';
