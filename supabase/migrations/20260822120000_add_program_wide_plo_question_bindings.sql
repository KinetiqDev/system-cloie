-- System CLOIE: Program evaluation question–PLO bindings.
--
-- Program Heads bind one or more active Program Learning Outcomes (PLO) to
-- each Likert question in PROGRAM_WIDE evaluation templates. Bindings are
-- program-owned template configuration (independent of CILO-to-PLO mapping,
-- no weights/priority) and are frozen into immutable PLO snapshots on the
-- central deployment when a Program-wide evaluation is published.

CREATE TABLE IF NOT EXISTS "instrument_template_plo_question_bindings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "template_id" UUID NOT NULL,
  "plo_id" UUID,
  "plo_code_snapshot" TEXT NOT NULL,
  "plo_description_snapshot" TEXT NOT NULL,
  "section_key" TEXT NOT NULL,
  "item_key" TEXT NOT NULL,
  "question_prompt_snapshot" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "instrument_template_plo_question_bindings_pkey" PRIMARY KEY ("id")
);

-- A question may cover several PLOs and a PLO may recur across questions;
-- uniqueness is per (template, question, PLO) pair.
CREATE UNIQUE INDEX IF NOT EXISTS "itpqb_template_plo_question_key"
  ON "instrument_template_plo_question_bindings"("template_id", "plo_id", "section_key", "item_key");

CREATE TABLE IF NOT EXISTS "central_deployment_plo_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "central_deployment_id" UUID NOT NULL,
  "plo_id" UUID,
  "plo_code_snapshot" TEXT NOT NULL,
  "plo_description_snapshot" TEXT NOT NULL,
  "section_key" TEXT NOT NULL,
  "item_key" TEXT NOT NULL,
  "question_prompt_snapshot" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "central_deployment_plo_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cdps_deployment_plo_question_key"
  ON "central_deployment_plo_snapshots"("central_deployment_id", "plo_id", "section_key", "item_key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_template_plo_question_bindings_template_id_fkey'
  ) THEN
    ALTER TABLE "instrument_template_plo_question_bindings"
      ADD CONSTRAINT "instrument_template_plo_question_bindings_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "instrument_templates"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_template_plo_question_bindings_plo_id_fkey'
  ) THEN
    ALTER TABLE "instrument_template_plo_question_bindings"
      ADD CONSTRAINT "instrument_template_plo_question_bindings_plo_id_fkey"
      FOREIGN KEY ("plo_id") REFERENCES "gos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'central_deployment_plo_snapshots_central_deployment_id_fkey'
  ) THEN
    ALTER TABLE "central_deployment_plo_snapshots"
      ADD CONSTRAINT "central_deployment_plo_snapshots_central_deployment_id_fkey"
      FOREIGN KEY ("central_deployment_id") REFERENCES "central_deployments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'central_deployment_plo_snapshots_plo_id_fkey'
  ) THEN
    ALTER TABLE "central_deployment_plo_snapshots"
      ADD CONSTRAINT "central_deployment_plo_snapshots_plo_id_fkey"
      FOREIGN KEY ("plo_id") REFERENCES "gos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
