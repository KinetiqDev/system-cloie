-- Reconcile the deployed schema with the current Prisma model contract.

DO $$
BEGIN
  CREATE TYPE "EvaluationTemplateType" AS ENUM ('PROGRAM_WIDE', 'COURSE_BOUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "central_deployments"
  ADD COLUMN IF NOT EXISTS "deployment_name" TEXT;
UPDATE "central_deployments"
SET "deployment_name" = 'Untitled deployment'
WHERE "deployment_name" IS NULL;
ALTER TABLE "central_deployments"
  ALTER COLUMN "deployment_name" SET NOT NULL;

ALTER TABLE "course_bound_evaluations"
  ADD COLUMN IF NOT EXISTS "deployment_name" TEXT;
UPDATE "course_bound_evaluations"
SET "deployment_name" = 'Untitled evaluation'
WHERE "deployment_name" IS NULL;
ALTER TABLE "course_bound_evaluations"
  ALTER COLUMN "deployment_name" SET NOT NULL;

ALTER TABLE "instrument_templates"
  ADD COLUMN IF NOT EXISTS "template_type" "EvaluationTemplateType" NOT NULL DEFAULT 'PROGRAM_WIDE';

ALTER TABLE "quantitative_response_items"
  ADD COLUMN IF NOT EXISTS "cilo_question_binding_id" UUID;

CREATE TABLE IF NOT EXISTS "course_bound_cilo_question_bindings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "course_bound_evaluation_id" UUID NOT NULL,
  "cilo_id" UUID,
  "cilo_description_snapshot" TEXT NOT NULL,
  "section_key" TEXT NOT NULL,
  "item_key" TEXT NOT NULL,
  "question_prompt_snapshot" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "course_bound_cilo_question_bindings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "course_bound_cilo_question_bindings_eval_cilo_key"
  ON "course_bound_cilo_question_bindings"("course_bound_evaluation_id", "cilo_id");
CREATE UNIQUE INDEX IF NOT EXISTS "course_bound_cilo_question_bindings_eval_question_key"
  ON "course_bound_cilo_question_bindings"("course_bound_evaluation_id", "section_key", "item_key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_bound_cilo_question_bindings_course_bound_evaluation_id_fkey'
  ) THEN
    ALTER TABLE "course_bound_cilo_question_bindings"
      ADD CONSTRAINT "course_bound_cilo_question_bindings_course_bound_evaluation_id_fkey"
      FOREIGN KEY ("course_bound_evaluation_id") REFERENCES "course_bound_evaluations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_bound_cilo_question_bindings_cilo_id_fkey'
  ) THEN
    ALTER TABLE "course_bound_cilo_question_bindings"
      ADD CONSTRAINT "course_bound_cilo_question_bindings_cilo_id_fkey"
      FOREIGN KEY ("cilo_id") REFERENCES "cilos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quantitative_response_items_cilo_question_binding_id_fkey'
  ) THEN
    ALTER TABLE "quantitative_response_items"
      ADD CONSTRAINT "quantitative_response_items_cilo_question_binding_id_fkey"
      FOREIGN KEY ("cilo_question_binding_id") REFERENCES "course_bound_cilo_question_bindings"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'TargetStakeholder'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'TargetStakeholder' AND e.enumlabel = 'GRADUATING_STUDENT'
    ) THEN
      CREATE TYPE "TargetStakeholder_new" AS ENUM ('STUDENT', 'ALUMNI', 'INDUSTRY_PARTNER');
      ALTER TABLE "central_deployments"
        ALTER COLUMN "target_stakeholder" TYPE "TargetStakeholder_new"
        USING CASE
          WHEN "target_stakeholder"::text = 'GRADUATING_STUDENT' THEN 'STUDENT'::text
          ELSE "target_stakeholder"::text
        END::"TargetStakeholder_new";
      ALTER TYPE "TargetStakeholder" RENAME TO "TargetStakeholder_old";
      ALTER TYPE "TargetStakeholder_new" RENAME TO "TargetStakeholder";
      DROP TYPE "TargetStakeholder_old";
    END IF;
  END IF;
END $$;

ALTER TABLE "cilos"
  DROP COLUMN IF EXISTS "academic_term",
  DROP COLUMN IF EXISTS "order";

ALTER TABLE "student_academic_profiles"
  DROP COLUMN IF EXISTS "is_graduating";

CREATE UNIQUE INDEX IF NOT EXISTS "gos_program_id_code_key"
  ON "gos"("program_id", "code");
