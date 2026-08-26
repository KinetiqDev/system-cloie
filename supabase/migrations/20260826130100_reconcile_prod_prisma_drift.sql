-- Reconcile prod drift with Prisma schema (and dev).
-- Prod retained original FK/index names from 20260721120156 while dev was
-- brought forward via prisma db push. Make every change idempotent so the
-- migration is a no-op on dev (already has new names) and fixes prod.
-- Generated from: npx prisma migrate diff --from-url $PROD_DIRECT_URL --to-schema-datamodel prisma --script

-- == FKs on course_bound_evaluation_exclusions ==
-- Drop old short names if they still exist (prod), no-op on dev.
ALTER TABLE "course_bound_evaluation_exclusions" DROP CONSTRAINT IF EXISTS "course_bound_evaluation_exclusions_actor_fkey";
ALTER TABLE "course_bound_evaluation_exclusions" DROP CONSTRAINT IF EXISTS "course_bound_evaluation_exclusions_evaluation_fkey";
ALTER TABLE "course_bound_evaluation_exclusions" DROP CONSTRAINT IF EXISTS "course_bound_evaluation_exclusions_membership_fkey";
-- reversed_by FK existed on both, but prod had short name; dev already renamed to long. Drop old if present, new will be recreated below.
ALTER TABLE "course_bound_evaluation_exclusions" DROP CONSTRAINT IF EXISTS "course_bound_evaluation_exclusions_reversed_by_fkey";

-- Drop old indexes if they exist (prod), no-op on dev
DROP INDEX IF EXISTS "academic_term_instances_school_year_id_idx";
DROP INDEX IF EXISTS "academic_term_instances_school_year_semester_term_key";
DROP INDEX IF EXISTS "course_assignment_memberships_assignment_scope_idx";
DROP INDEX IF EXISTS "course_assignments_class_identity_key";
DROP INDEX IF EXISTS "course_assignments_unique_key";
DROP INDEX IF EXISTS "course_bound_evaluations_term_instance_id_idx";

-- Create new indexes (no-op if already exists on dev)
CREATE INDEX IF NOT EXISTS "academic_term_instances_school_year_id_semester_term_idx" ON "academic_term_instances"("school_year_id", "semester", "term");
CREATE INDEX IF NOT EXISTS "course_assignments_term_instance_id_course_id_program_id_ye_idx" ON "course_assignments"("term_instance_id", "course_id", "program_id", "year_level", "section");

-- Rename FKs where old truncated names exist (prod truncations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cilo_institutional_outcome_mappings_institutional_outcome_id_fk') THEN
    ALTER TABLE "cilo_institutional_outcome_mappings" RENAME CONSTRAINT "cilo_institutional_outcome_mappings_institutional_outcome_id_fk" TO "cilo_institutional_outcome_mappings_institutional_outcome__fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bound_cilo_question_bindings_course_bound_evaluation_id_') THEN
    ALTER TABLE "course_bound_cilo_question_bindings" RENAME CONSTRAINT "course_bound_cilo_question_bindings_course_bound_evaluation_id_" TO "course_bound_cilo_question_bindings_course_bound_evaluatio_fkey";
  END IF;
END $$;

-- Recreate FKs with canonical Prisma names (no-op if already exists on dev)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bound_evaluation_exclusions_course_bound_evaluation_fkey') THEN
    ALTER TABLE "course_bound_evaluation_exclusions" ADD CONSTRAINT "course_bound_evaluation_exclusions_course_bound_evaluation_fkey" FOREIGN KEY ("course_bound_evaluation_id", "course_assignment_id") REFERENCES "course_bound_evaluations"("id", "course_assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bound_evaluation_exclusions_course_assignment_membe_fkey') THEN
    ALTER TABLE "course_bound_evaluation_exclusions" ADD CONSTRAINT "course_bound_evaluation_exclusions_course_assignment_membe_fkey" FOREIGN KEY ("course_assignment_membership_id", "course_assignment_id") REFERENCES "course_assignment_memberships"("id", "course_assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bound_evaluation_exclusions_excluded_by_fkey') THEN
    ALTER TABLE "course_bound_evaluation_exclusions" ADD CONSTRAINT "course_bound_evaluation_exclusions_excluded_by_fkey" FOREIGN KEY ("excluded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Reversed_by was dropped above; recreate (exists on dev as long name, will be skipped)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_bound_evaluation_exclusions_reversed_by_fkey') THEN
    ALTER TABLE "course_bound_evaluation_exclusions" ADD CONSTRAINT "course_bound_evaluation_exclusions_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Also need to recreate the dropped evaluation/membership FKs' replacement for excluded_by was above; the two composite FKs already handled.
-- The original actor/evaluation/membership FKs are replaced by the two composite + excluded_by above; ensure all four are present.

-- Rename indexes where old truncated names exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cilo_institutional_outcome_mappings_cilo_id_institutional_outco') THEN
    ALTER INDEX "cilo_institutional_outcome_mappings_cilo_id_institutional_outco" RENAME TO "cilo_institutional_outcome_mappings_cilo_id_institutional_o_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cilo_institutional_outcome_mappings_institutional_outcome_id_id') THEN
    ALTER INDEX "cilo_institutional_outcome_mappings_institutional_outcome_id_id" RENAME TO "cilo_institutional_outcome_mappings_institutional_outcome_i_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'course_assignments_course_idx') THEN
    ALTER INDEX "course_assignments_course_idx" RENAME TO "course_assignments_term_instance_id_course_id_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'course_assignments_faculty_idx') THEN
    ALTER INDEX "course_assignments_faculty_idx" RENAME TO "course_assignments_term_instance_id_faculty_id_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'course_bound_evaluation_exclusions_evaluation_idx') THEN
    ALTER INDEX "course_bound_evaluation_exclusions_evaluation_idx" RENAME TO "course_bound_evaluation_exclusions_course_bound_evaluation__idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'course_bound_evaluation_exclusions_membership_idx') THEN
    ALTER INDEX "course_bound_evaluation_exclusions_membership_idx" RENAME TO "course_bound_evaluation_exclusions_course_assignment_member_idx";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'course_bound_evaluation_targets_course_bound_evaluation_id_prog') THEN
    ALTER INDEX "course_bound_evaluation_targets_course_bound_evaluation_id_prog" RENAME TO "course_bound_evaluation_targets_course_bound_evaluation_id__key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'industry_partner_program_affiliations_industry_partner_id_progr') THEN
    ALTER INDEX "industry_partner_program_affiliations_industry_partner_id_progr" RENAME TO "industry_partner_program_affiliations_industry_partner_id_p_key";
  END IF;
END $$;
