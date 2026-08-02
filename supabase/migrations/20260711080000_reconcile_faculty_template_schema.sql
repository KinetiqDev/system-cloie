-- Reconcile the faculty instrument-template schema with Prisma before the
-- program-deletion restriction migration runs.

ALTER TABLE "instrument_templates"
  ADD COLUMN IF NOT EXISTS "faculty_owner_id" UUID,
  ADD COLUMN IF NOT EXISTS "source_template_id" UUID,
  ADD COLUMN IF NOT EXISTS "bound_course_id" UUID,
  ADD COLUMN IF NOT EXISTS "bound_program_id" UUID,
  ADD COLUMN IF NOT EXISTS "bound_major_id" UUID;

CREATE TABLE IF NOT EXISTS "instrument_template_cilo_question_bindings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "template_id" UUID NOT NULL,
  "cilo_id" UUID,
  "cilo_description_snapshot" TEXT NOT NULL,
  "section_key" TEXT NOT NULL,
  "item_key" TEXT NOT NULL,
  "question_prompt_snapshot" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "instrument_template_cilo_question_bindings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "itcqb_template_cilo_key"
  ON "instrument_template_cilo_question_bindings"("template_id", "cilo_id");
CREATE UNIQUE INDEX IF NOT EXISTS "itcqb_template_question_key"
  ON "instrument_template_cilo_question_bindings"("template_id", "section_key", "item_key");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_templates_faculty_owner_id_fkey'
  ) THEN
    ALTER TABLE "instrument_templates"
      ADD CONSTRAINT "instrument_templates_faculty_owner_id_fkey"
      FOREIGN KEY ("faculty_owner_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_templates_source_template_id_fkey'
  ) THEN
    ALTER TABLE "instrument_templates"
      ADD CONSTRAINT "instrument_templates_source_template_id_fkey"
      FOREIGN KEY ("source_template_id") REFERENCES "instrument_templates"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_templates_bound_course_id_fkey'
  ) THEN
    ALTER TABLE "instrument_templates"
      ADD CONSTRAINT "instrument_templates_bound_course_id_fkey"
      FOREIGN KEY ("bound_course_id") REFERENCES "courses"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_templates_bound_program_id_fkey'
  ) THEN
    ALTER TABLE "instrument_templates"
      ADD CONSTRAINT "instrument_templates_bound_program_id_fkey"
      FOREIGN KEY ("bound_program_id") REFERENCES "programs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_templates_bound_major_id_fkey'
  ) THEN
    ALTER TABLE "instrument_templates"
      ADD CONSTRAINT "instrument_templates_bound_major_id_fkey"
      FOREIGN KEY ("bound_major_id") REFERENCES "majors"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_template_cilo_question_bindings_template_id_fkey'
  ) THEN
    ALTER TABLE "instrument_template_cilo_question_bindings"
      ADD CONSTRAINT "instrument_template_cilo_question_bindings_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "instrument_templates"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instrument_template_cilo_question_bindings_cilo_id_fkey'
  ) THEN
    ALTER TABLE "instrument_template_cilo_question_bindings"
      ADD CONSTRAINT "instrument_template_cilo_question_bindings_cilo_id_fkey"
      FOREIGN KEY ("cilo_id") REFERENCES "cilos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
